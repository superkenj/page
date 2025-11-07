import os
import uuid
from datetime import datetime
from math import isnan
from flask import Flask, jsonify, request
from flask_cors import CORS
from firestore_client import get_client
from graph_service import (
    build_graph_from_topics,
    recommend_next_topics,
    validate_dag,
    nodes_with_titles,
)
from flask import abort

app = Flask(__name__)
CORS(app)

db = get_client()

def compute_mastered_from_scores(scores: dict, finals: dict, threshold: float = 0.5):
    """
    Return list of topic_ids considered mastered based on scores and finals.
    threshold: fraction (0.5 = half of final)
    """
    mastered = []
    for topic_id, sc in (scores or {}).items():
        try:
            sc_val = float(sc)
        except Exception:
            continue
        max_sc = None
        if finals and topic_id in finals:
            try:
                max_sc = float(finals[topic_id])
            except Exception:
                max_sc = None
        # if no topic-specific final, don't assume global final unless provided elsewhere
        if max_sc is None:
            # skip if no max known (cannot decide)
            continue
        if max_sc > 0 and sc_val >= (threshold * max_sc):
            mastered.append(topic_id)
    # unique
    return list(dict.fromkeys(mastered))


@app.route("/")
def home():
    return jsonify({"message": "PaGe Flask backend is running"})

@app.route("/dashboard/summary", methods=["GET"])
def dashboard_summary():
    # Students
    snaps = db.collection("students").stream()
    students = []
    pass_count, fail_count = 0, 0
    for d in snaps:
        doc = d.to_dict()
        total_score = doc.get("score") or (doc.get("scores", {}).get("general") if doc.get("scores") else 0)
        total_final = doc.get("final") or (doc.get("finals", {}).get("general") if doc.get("finals") else 0)
        status = ""
        if total_final:
            status = "PASS" if total_score >= (total_final / 2) else "FAIL"
        if status == "PASS": pass_count += 1
        elif status == "FAIL": fail_count += 1
        students.append({
            "id": d.id,
            "name": doc.get("name"),
            "score": total_score,
            "final": total_final,
            "status": status
        })

    # Topics
    topics_ref = db.collection("topics")
    topic_docs = list(topics_ref.stream())
    topic_count = len(topic_docs)

    return jsonify({
        "students_total": len(students),
        "students_pass": pass_count,
        "students_fail": fail_count,
        "topic_count": topic_count,
    })

@app.route("/topics")
def get_topics():
    topics_ref = db.collection("topics").stream()
    topics = []
    for doc in topics_ref:
        data = doc.to_dict()
        topics.append({
            "id": data.get("id"),
            "name": data.get("name"),
            "description": data.get("description"),
            "prerequisites": data.get("prerequisites", [])
        })
    return jsonify(topics)

@app.route("/topics/graph")
def get_graph():
    topics_ref = db.collection("topics")
    docs = [{"id": d.id, **d.to_dict()} for d in topics_ref.stream()]
    G = build_graph_from_topics(docs)
    return jsonify({
        "nodes": list(G.nodes),
        "edges": list(G.edges),
        "count": len(G.nodes)
    })

@app.route("/topics/graph/details", methods=["GET"])
def topics_graph_details():
    topics_ref = db.collection("topics")
    docs = [{"id": d.id, **d.to_dict()} for d in topics_ref.stream()]
    G = build_graph_from_topics(docs)
    
    cycles = validate_dag(G)
    if cycles:
        return jsonify({"error": "Graph has cycles", "cycles": cycles}), 500
    
    # assign levels (new)
    try:
        from graph_service import assign_levels_to_graph
        assign_levels_to_graph(G)
    except Exception as e:
        # if something goes wrong with levels, continue but log
        print("assign_levels error:", e)

    # produce nodes with metadata (title/description/cluster/level)
    nodes = []
    for n in G.nodes:
        node_data = G.nodes[n] if isinstance(G.nodes[n], dict) else {}
        nodes.append({
            "id": n,
            "title": node_data.get("name") or node_data.get("title") or n,
            "description": node_data.get("description", ""),
            "cluster": node_data.get("cluster", ""),
            "level": node_data.get("level", 0)
        })

    edges = [list(e) for e in G.edges()]
    return jsonify({"nodes": nodes, "edges": edges, "count": len(nodes)})

# GET list of topics
@app.route("/topics/list", methods=["GET"])
def list_topics():
    snaps = db.collection("topics").stream()
    out = []
    for d in snaps:
        doc = d.to_dict()
        out.append({
            "id": d.id,
            "name": doc.get("name"),
            "description": doc.get("description"),
            "prerequisites": doc.get("prerequisites", []),
            "cluster": doc.get("cluster", "Uncategorized")
        })
    return jsonify(out)

# Create or update a topic
@app.route("/topics/<topic_id>", methods=["POST"])
def upsert_topic(topic_id):
    body = request.get_json() or {}
    allowed = {}
    for k in ("title", "prerequisites", "description"):
        if k in body:
            allowed[k] = body[k]
    if not allowed:
        return jsonify({"error": "No valid fields provided"}), 400
    db.collection("topics").document(topic_id).set(allowed, merge=True)
    return jsonify({"message": f"Topic {topic_id} saved"}), 201

# Delete a topic
@app.route("/topics/<topic_id>", methods=["DELETE"])
def delete_topic(topic_id):
    db.collection("topics").document(topic_id).delete()
    return jsonify({"message": f"Topic {topic_id} deleted"}), 200

# Delete student
@app.route("/students/<student_id>", methods=["DELETE"])
def delete_student(student_id):
    db.collection("students").document(student_id).delete()
    return jsonify({"message": f"Student {student_id} deleted"}), 200

@app.route("/students/<student_id>/scores", methods=["POST"])
def update_student_scores(student_id):
    """
    POST payload:
    {
      "scores": { "topic_id": number, ... },
      "finals": { "topic_id": number, ... },        # optional
      "threshold": 0.5                             # optional, fraction
    }
    """
    body = request.get_json() or {}
    scores = body.get("scores", {}) or {}
    finals = body.get("finals", {}) or {}
    try:
        threshold = float(body.get("threshold", os.getenv("MASTERED_THRESHOLD", 0.5)))
    except Exception:
        threshold = 0.5

    doc_ref = db.collection("students").document(student_id)
    snap = doc_ref.get()
    existing = snap.to_dict() if snap.exists else {}

    # merge scores & finals (existing values preserved unless overwritten)
    merged_scores = dict(existing.get("scores", {}) or {})
    merged_scores.update(scores)

    merged_finals = dict(existing.get("finals", {}) or {})
    merged_finals.update(finals)

    # compute mastered topics from merged data
    computed_mastered = compute_mastered_from_scores(merged_scores, merged_finals, threshold)

    # merge with explicit existing mastered (preserve teacher-validated mastered)
    existing_mastered = list(existing.get("mastered", []) or [])
    # combine preserving unique order (existing first)
    new_mastered = list(dict.fromkeys(existing_mastered + computed_mastered))

    # write back
    doc_ref.set({
        "scores": merged_scores,
        "finals": merged_finals,
        "mastered": new_mastered
    }, merge=True)

    # Build the graph & recommend next topics
    topics_ref = db.collection("topics")
    docs = [{"id": d.id, **d.to_dict()} for d in topics_ref.stream()]
    G = build_graph_from_topics(docs)

    # validate DAG and compute recommended (reuse your function)
    try:
        rec_ids = recommend_next_topics(G, new_mastered, limit=10)
    except Exception as e:
        return jsonify({"error": "Recommendation error", "details": str(e)}), 500

    # map rec_ids to titles
    id_to_title = {n: G.nodes[n].get("title", "") for n in G.nodes}
    recommended = [{"id": rid, "title": id_to_title.get(rid, "")} for rid in rec_ids]

    return jsonify({
        "student_id": student_id,
        "mastered": new_mastered,
        "recommended": recommended
    })

@app.route("/students/bulk_upload", methods=["POST"])
def students_bulk_upload():
    """
    Accepts JSON array of student entries:
    [
      {
        "id": "2022-01339",
        "name": "Student Name",        # optional
        "scores": { "topic_id": value, ... },
        "finals": { "topic_id": value, ... }
      },
      ...
    ]
    It will upsert student docs and compute updated mastered & recommended for each.
    """
    payload = request.get_json() or []
    if not isinstance(payload, list):
        return jsonify({"error": "Expected list"}), 400

    results = []
    # pre-build graph once
    topics_ref = db.collection("topics")
    docs = [{"id": d.id, **d.to_dict()} for d in topics_ref.stream()]
    G = build_graph_from_topics(docs)

    for entry in payload:
        sid = entry.get("id")
        if not sid:
            results.append({"error": "missing id", "entry": entry})
            continue
        scores = entry.get("scores", {}) or {}
        finals = entry.get("finals", {}) or {}
        threshold = float(entry.get("threshold", os.getenv("MASTERED_THRESHOLD", 0.5)))

        doc_ref = db.collection("students").document(sid)
        snap = doc_ref.get()
        existing = snap.to_dict() if snap.exists else {}

        merged_scores = dict(existing.get("scores", {}) or {})
        merged_scores.update(scores)
        merged_finals = dict(existing.get("finals", {}) or {})
        merged_finals.update(finals)

        computed_mastered = compute_mastered_from_scores(merged_scores, merged_finals, threshold)
        existing_mastered = list(existing.get("mastered", []) or [])
        new_mastered = list(dict.fromkeys(existing_mastered + computed_mastered))

        doc_ref.set({
            "name": entry.get("name", existing.get("name")),
            "scores": merged_scores,
            "finals": merged_finals,
            "mastered": new_mastered
        }, merge=True)

        # recommend
        try:
            rec_ids = recommend_next_topics(G, new_mastered, limit=10)
            id_to_title = {n: G.nodes[n].get("title", "") for n in G.nodes}
            recommended = [{"id": rid, "title": id_to_title.get(rid, "")} for rid in rec_ids]
        except Exception as e:
            recommended = []
        results.append({
            "id": sid,
            "mastered": new_mastered,
            "recommended": recommended
        })

    return jsonify({"results": results})

@app.route("/students/list", methods=["GET"])
def list_students():
    snaps = db.collection("students").stream()
    out = []
    for d in snaps:
        doc = d.to_dict()
        # compute status for backward compatibility
        total_score = doc.get("score") or (doc.get("scores", {}).get("general") if doc.get("scores") else 0)
        total_final = doc.get("final") or (doc.get("finals", {}).get("general") if doc.get("finals") else 0)
        status = ""
        if total_final:
            status = "PASS" if total_score >= (total_final / 2) else "FAIL"
        out.append({
            "id": d.id,
            "name": doc.get("name"),
            "score": total_score,
            "final": total_final,
            "status": status
        })
    return jsonify(out)

@app.route("/students/<student_id>", methods=["GET"])
def get_student(student_id):
    doc_ref = db.collection("students").document(student_id)
    snap = doc_ref.get()
    if not snap.exists:
        return jsonify({"error": "Student not found"}), 404
    return jsonify({"id": snap.id, **snap.to_dict()})


@app.route("/students/<student_id>", methods=["POST"])
def upsert_student(student_id):
    body = request.get_json() or {}
    allowed = {}
    for k in ("name", "scores", "finals", "mastered"):
        if k in body:
            allowed[k] = body[k]

    if not allowed:
        return jsonify({"error": "No valid fields provided"}), 400

    db.collection("students").document(student_id).set(allowed, merge=True)
    return jsonify({"message": f"Student {student_id} updated"}), 201

@app.route("/students/<student_id>/path", methods=["GET"])
def student_path(student_id):
    # Query params
    try:
        limit = int(request.args.get("limit", 10))
    except (ValueError, TypeError):
        limit = 10

    # fetch student doc
    doc_ref = db.collection("students").document(student_id)
    snap = doc_ref.get()
    if not snap.exists:
        return jsonify({"error": "Student not found"}), 404
    student = snap.to_dict()

    # compute mastered topics
    # priority: explicit 'mastered' list -> scores+finals mapping -> empty
    mastered = list(student.get("mastered", []) or [])
    if not mastered and student.get("scores"):
        scores = student.get("scores", {})        # e.g. {"fractions": 31}
        finals = student.get("finals", {})        # e.g. {"fractions": 60}
        for topic_id, sc in scores.items():
            max_sc = finals.get(topic_id, student.get("final") or 0)
            if max_sc and sc >= (max_sc / 2):
                mastered.append(topic_id)

    # Build graph and mapping id -> title
    topics_ref = db.collection("topics")
    docs = [{"id": d.id, **d.to_dict()} for d in topics_ref.stream()]
    G = build_graph_from_topics(docs)

    # validate DAG
    cycles = validate_dag(G)
    if cycles:
        return jsonify({"error": "Curriculum graph has cycles", "cycles": cycles}), 500

    try:
        rec_ids = recommend_next_topics(G, mastered, limit=limit)
    except ValueError as e:
        return jsonify({"error": str(e)}), 500

    # Map topic IDs → detailed info
    id_to_data = {
        n: {
            "title": G.nodes[n].get("name") or G.nodes[n].get("title", n),
            "description": G.nodes[n].get("description", ""),
            "cluster": G.nodes[n].get("cluster", "Uncategorized")
        }
        for n in G.nodes
    }

    # Build detailed recommended and mastered lists
    recommended = [
        {
            "id": rid,
            "title": id_to_data.get(rid, {}).get("title", rid),
            "description": id_to_data.get(rid, {}).get("description", ""),
            "cluster": id_to_data.get(rid, {}).get("cluster", "Uncategorized")
        }
        for rid in rec_ids
    ]

    mastered_detailed = [
        {
            "id": mid,
            "title": id_to_data.get(mid, {}).get("title", mid),
            "description": id_to_data.get(mid, {}).get("description", ""),
            "cluster": id_to_data.get(mid, {}).get("cluster", "Uncategorized")
        }
        for mid in mastered
    ]

    return jsonify({
        "student_id": student_id,
        "mastered": mastered_detailed,
        "recommended": recommended
    })


@app.route("/students/<student_id>/mastered", methods=["POST"])
def add_mastered(student_id):
    body = request.get_json() or {}
    topics = body.get("topics")
    if not topics or not isinstance(topics, list):
        return jsonify({"error": "Missing topics list"}), 400
    doc_ref = db.collection("students").document(student_id)
    snap = doc_ref.get()
    existing = snap.to_dict().get("mastered", []) if snap.exists else []
    # merge unique
    new_mastered = list(dict.fromkeys(existing + topics))
    doc_ref.set({"mastered": new_mastered}, merge=True)
    return jsonify({"message": "Mastered updated", "mastered": new_mastered})

@app.route("/content", methods=["POST"])
def add_content():
    """
    Accepts JSON (or multipart) like:
    {
      "topic_id": "place_val_dec",
      "title": "Decimal Place Value – Math with Mr J",
      "description": "...",
      "link": "https://www.youtube.com/...",
      "type": "video",  # or "presentation", "pdf", etc.
      "file": <binary file upload optional>
    }
    """
    body = None
    if request.content_type.startswith("multipart/"):
        # handle file upload + form fields
        body = request.form.to_dict()
        file = request.files.get("file")
    else:
        body = request.get_json() or {}
        file = None

    topic_id = body.get("topic_id")
    title    = body.get("title")
    if not topic_id or not title:
        return jsonify({"error": "topic_id and title are required"}), 400

    description = body.get("description", "")
    link        = body.get("link", "")
    ctype       = body.get("type", "resource")

    data = {
        "topic_id": topic_id,
        "title": title,
        "description": description,
        "link": link,
        "type": ctype,
        "created_by": body.get("created_by", "teacher"),
        "created_at": datetime.utcnow().isoformat(),
    }

    if file:
        # save the uploaded file to storage (e.g., Firebase Storage, AWS S3)
        # and set data["link"] = URL to downloadable/streamable file
        # e.g., upload and then:
        # data["link"] = uploaded_file_url
        pass

    doc_ref = db.collection("contents").document()
    doc_ref.set(data)
    return jsonify({"message":"Content added", "id": doc_ref.id}), 201

@app.route("/content/<topic_id>", methods=["GET"])
def get_content_for_topic(topic_id):
    snaps = db.collection("contents").where("topic_id", "==", topic_id).stream()
    out = []
    for d in snaps:
        doc = d.to_dict()
        out.append({"id": d.id, **doc})
    return jsonify(out)


@app.route("/content", methods=["GET"])
def list_all_content():
    snaps = db.collection("contents").stream()
    out = []
    for d in snaps:
        doc = d.to_dict()
        out.append({"id": d.id, **doc})
    return jsonify(out)


@app.route("/content/<doc_id>", methods=["DELETE"])
def delete_content(doc_id):
    db.collection("contents").document(doc_id).delete()
    return jsonify({"message": "Content deleted"}), 200

@app.route("/content/<doc_id>", methods=["POST"])
def update_content(doc_id):
    body = request.get_json() or {}
    allowed = {k: v for k, v in body.items() if k in ["link", "description", "type", "title"]}
    if not allowed:
        return jsonify({"error": "No valid fields to update"}), 400

    db.collection("contents").document(doc_id).set(allowed, merge=True)
    return jsonify({"message": f"Content {doc_id} updated"}), 200

@app.route("/students/<student_id>/content_seen", methods=["POST"])
def mark_content_seen(student_id):
    body = request.get_json() or {}
    content_id = body.get("content_id")
    if not content_id:
        return jsonify({"error":"content_id required"}), 400
    doc_ref = db.collection("students").document(student_id)
    snap = doc_ref.get()
    existing = snap.to_dict() if snap.exists else {}
    seen = list(existing.get("content_seen", []) or [])
    if content_id not in seen:
        seen.append(content_id)
    doc_ref.set({"content_seen": seen}, merge=True)
    return jsonify({"message":"ok", "content_seen": seen})

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    user_id = data.get("id")

    if not user_id:
        return jsonify({"error": "Missing user ID"}), 400

    # 1️⃣ Check teacher first
    teacher_ref = db.collection("users").document(user_id).get()
    if teacher_ref.exists:
        teacher = teacher_ref.to_dict()
        return jsonify({
            "id": user_id,
            "name": teacher.get("name"),
            "role": "teacher"
        })

    # 2️⃣ Check student next
    student_ref = db.collection("students").document(user_id).get()
    if student_ref.exists:
        student = student_ref.to_dict()
        return jsonify({
            "id": user_id,
            "name": student.get("name"),
            "role": "student"
        })

    return jsonify({"error": "User not found"}), 404

if __name__ == "__main__":
    app.run(port=5000, debug=True)
