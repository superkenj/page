from flask import Flask, jsonify, request
from flask_cors import CORS
from firestore_client import get_client
from graph_service import build_graph_from_topics, recommend_next_topics

app = Flask(__name__)
CORS(app)

db = get_client()

@app.route("/")
def home():
    return jsonify({"message": "PaGe Flask backend is running"})

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

if __name__ == "__main__":
    app.run(port=5000, debug=True)
