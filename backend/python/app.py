from flask import Flask, jsonify
import networkx as nx

app = Flask(__name__)

def build_graph():
    G = nx.DiGraph()
    G.add_edge("basic_arithmetic", "fractions")
    G.add_edge("fractions", "decimals")
    return G

@app.route("/recommend/<student_id>")
def recommend(student_id):
    G = build_graph()
    path = nx.shortest_path(G, source="basic_arithmetic", target="decimals")
    return jsonify({"student": student_id, "recommended_path": path})

if __name__ == "__main__":
    app.run(port=5000)
