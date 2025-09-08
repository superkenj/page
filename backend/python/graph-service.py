import networkx as nx

def generate_learning_path():
    G = nx.DiGraph()
    G.add_edges_from([
        ("Addition", "Subtraction"),
        ("Subtraction", "Multiplication"),
        ("Multiplication", "Division")
    ])

    path = list(nx.topological_sort(G))
    return path