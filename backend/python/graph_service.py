import networkx as nx

def build_graph_from_topics(topics):
    G = nx.DiGraph()
    for t in topics:
        tid = t.get("id") or t.get("doc_id")
        if not tid:
            continue
        G.add_node(tid, title=t.get("title", ""))
    for t in topics:
        tid = t.get("id") or t.get("doc_id")
        for p in t.get("prerequisites", []):
            if p != tid:
                G.add_edge(p, tid)
    return G

def recommend_next_topics(G, mastered, limit=10):
    if not nx.is_directed_acyclic_graph(G):
        raise ValueError("Curriculum graph must be a DAG")

    mastered_set = set(mastered or [])
    rec = []
    for node in nx.topological_sort(G):
        if node in mastered_set:
            continue
        prereqs = set(G.predecessors(node))
        if prereqs.issubset(mastered_set):
            rec.append(node)
            if len(rec) >= limit:
                break
    return rec
