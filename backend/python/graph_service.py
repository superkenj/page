# backend/python/graph_service.py
from typing import Iterable, List, Dict, Any, Optional
import networkx as nx

def build_graph_from_topics(topics: Iterable[Dict[str, Any]]) -> nx.DiGraph:
    """
    Build a directed graph from topics.
    Each topic should be a dict with 'id' and optionally 'title' and 'prerequisites' (list).
    Nodes will have attribute 'title'.
    """
    G = nx.DiGraph()
    # Add nodes with title attribute
    for t in topics:
        tid = t.get("id") or t.get("doc_id")
        if not tid:
            continue
        title = t.get("title", "")
        G.add_node(tid, title=title)

    # Add edges from prereq -> topic
    for t in topics:
        tid = t.get("id") or t.get("doc_id")
        if not tid:
            continue
        prereqs = t.get("prerequisites") or []
        for p in prereqs:
            if p == tid:
                continue
            # If prereq node missing, still create it (title empty) to avoid KeyError later
            if p not in G:
                G.add_node(p, title="")
            G.add_edge(p, tid)
    return G

def validate_dag(G: nx.DiGraph) -> Optional[List[List[str]]]:
    """
    Return None if DAG (no cycles). If cycles exist, return list of cycles (each cycle is list of nodes).
    """
    try:
        cycles = list(nx.simple_cycles(G))
        if cycles:
            return cycles
        return None
    except Exception:
        return [["error"]]

def recommend_next_topics(G: nx.DiGraph, mastered: Iterable[str], limit: int = 10) -> List[str]:
    """
    Recommendation strategy:
    1. If graph not DAG -> raise ValueError.
    2. If mastered empty -> recommend source nodes (no prereqs).
    3. Compute "unlocked" nodes: nodes not mastered whose prerequisites are all in mastered -> return them in topological order.
    4. If none unlocked, find the nearest unmastered node reachable from some mastered node (min remaining path length),
       and return the remaining nodes in that shortest path (so it suggests the minimal sequence to reach that node).
    5. Fallback: return earliest unmastered nodes in topological order.
    """
    if not nx.is_directed_acyclic_graph(G):
        raise ValueError("Curriculum graph must be a DAG")

    mastered_set = set(mastered or [])

    # Topological order for deterministic recommendation
    topo = list(nx.topological_sort(G))

    # 1) Candidates unlocked now (prereqs subset of mastered)
    unlocked = []
    for n in topo:
        if n in mastered_set:
            continue
        preds = set(G.predecessors(n))
        if preds.issubset(mastered_set):
            unlocked.append(n)
    if unlocked:
        return unlocked[:limit]

    # 2) If nothing unlocked and no mastered topics -> recommend source nodes (start here)
    if not mastered_set:
        sources = [n for n in topo if G.in_degree(n) == 0]
        return sources[:limit]

    # 3) Find nearest unmastered node reachable from any mastered node
    best_path = None
    best_len = None

    unmastered_nodes = [n for n in topo if n not in mastered_set]

    for target in unmastered_nodes:
        # For each mastered node, check if there is a path to target
        for m in mastered_set:
            try:
                if nx.has_path(G, m, target):
                    path = nx.shortest_path(G, source=m, target=target)
                    # filter out already mastered nodes (we only need the remaining sequence)
                    remaining = [p for p in path if p not in mastered_set]
                    if not remaining:
                        continue
                    l = len(remaining)
                    if best_len is None or l < best_len:
                        best_len = l
                        best_path = remaining
            except nx.NetworkXNoPath:
                continue

    if best_path:
        return best_path[:limit]

    # 4) Fallback: return earliest unmastered nodes in topo order
    return unmastered_nodes[:limit]

def nodes_with_titles(G: nx.DiGraph) -> List[Dict[str, Any]]:
    """
    Return list of nodes as dicts {id, title, indegree, outdegree, prerequisites}
    """
    out = []
    for n in G.nodes:
        out.append({
            "id": n,
            "title": G.nodes[n].get("title", ""),
            "indegree": G.in_degree(n),
            "outdegree": G.out_degree(n),
            "prerequisites": list(G.predecessors(n))
        })
    return out

def assign_levels_to_graph(G):
    """
    Assign integer 'level' attribute to each node.
    Root nodes (no predecessors) => level 0.
    node.level = max(predecessor.level) + 1
    """
    # safe-guard: if graph empty
    if G is None or len(G.nodes) == 0:
        return {}

    levels = {}
    try:
        topo = list(nx.topological_sort(G))
    except Exception as e:
        # If graph has cycles, bail
        raise

    for n in topo:
        preds = list(G.predecessors(n))
        if not preds:
            levels[n] = 0
        else:
            levels[n] = max(levels.get(p, 0) for p in preds) + 1
    # attach to node attrs
    for n, lvl in levels.items():
        G.nodes[n]["level"] = lvl
    return levels