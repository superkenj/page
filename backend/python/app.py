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
    nodes = nodes_with_titles(G)
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
            "prerequisites": doc.get("prerequisites", [])
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

    # Map rec_ids to {id,title}
    id_to_title = {n: G.nodes[n].get("title", "") for n in G.nodes}
    recommended = [{"id": rid, "title": id_to_title.get(rid, "")} for rid in rec_ids]

    # return current mastered for UI context too
    return jsonify({"student_id": student_id, "mastered": mastered, "recommended": recommended})

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

if __name__ == "__main__":
    app.run(port=5000, debug=True)
