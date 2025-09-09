from flask import Flask, jsonify, request
from flask_cors import CORS
from firestore_client import get_client
from graph_service import build_graph_from_topics, recommend_next_topics
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

@app.route("/students/<student_id>/path")
def student_path(student_id):
    doc_ref = db.collection("students").document(student_id)
    snap = doc_ref.get()
    if not snap.exists:
        return jsonify({"error": "Student not found"}), 404
    student = snap.to_dict()

    # Determine mastered topics
    mastered = student.get("mastered", [])
    if not mastered and student.get("scores"):
        scores = student.get("scores", {})
        finals = student.get("finals", {})
        for topic_id, sc in scores.items():
            max_sc = finals.get(topic_id, student.get("final") or 0)
            if max_sc > 0 and sc >= (max_sc / 2):
                mastered.append(topic_id)

    # Build graph
    topics_ref = db.collection("topics")
    docs = [{"id": d.id, **d.to_dict()} for d in topics_ref.stream()]
    G = build_graph_from_topics(docs)

    # Recommend next topics
    try:
        recommended = recommend_next_topics(G, mastered, limit=10)
    except ValueError as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"recommended": recommended})

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
