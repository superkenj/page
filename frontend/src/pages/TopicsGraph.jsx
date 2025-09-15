// frontend/src/pages/TopicsGraph.jsx
import React, { useEffect, useState, useRef } from "react";
import { ForceGraph2D } from "react-force-graph";
import { useNavigate } from "react-router-dom";
import { hierarchy, tree } from "d3-hierarchy";   // ⬅ import tree tools

const API_BASE = "http://localhost:5000";

// helper: arrange nodes in horizontal tree
function toTreeLayout(nodes, links) {
  // map: parent -> children
  const childrenMap = {};
  links.forEach(l => {
    if (!childrenMap[l.source]) childrenMap[l.source] = [];
    childrenMap[l.source].push(l.target);
  });

  // find root (node that is never a target)
  const allTargets = new Set(links.map(l => l.target));
  const rootNode = nodes.find(n => !allTargets.has(n.id));

  if (!rootNode) return nodes; // fallback if no root found

  // build d3 hierarchy
  const root = hierarchy(rootNode, d =>
    (childrenMap[d.id] || []).map(cid => nodes.find(n => n.id === cid))
  );

  // compute layout (spacing)
  const treeLayout = tree().nodeSize([80, 200]); // y-gap, x-gap
  treeLayout(root);

  // assign positions
  root.each(d => {
    d.data.x = d.y; // horizontal: use y as x
    d.data.y = d.x;
  });

  return nodes;
}

export default function TopicsGraph() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const fgRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/topics/graph/details`);
        const json = await res.json();
        if (json.error) {
          console.error("Graph details error:", json);
          setGraphData({ nodes: [], links: [] });
          return;
        }

        const nodes = (json.nodes || []).map(n => ({
          id: n.id,
          title: n.title ?? n.name ?? n.id,
          meta: n,
        }));

        const links = (json.edges || []).map(e => ({
          source: e[0],
          target: e[1],
        }));

        // ⬅️ arrange nodes as horizontal tree
        const laidOutNodes = toTreeLayout(nodes, links);

        setGraphData({ nodes: laidOutNodes, links });

        setTimeout(() => fgRef.current?.zoomToFit(400, 50), 200);
      } catch (err) {
        console.error("Failed load graph:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // draw node: circle + text
  const nodeCanvasObject = (node, ctx, globalScale) => {
    const label = node.title || node.id;
    const fontSize = 12 / globalScale;
    ctx.font = `${Math.max(fontSize, 8)}px Sans-Serif`;

    ctx.beginPath();
    ctx.arc(node.x, node.y, 10, 0, 2 * Math.PI, false);
    ctx.fillStyle = node.color || "#cfcfcf";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#333";
    ctx.stroke();

    ctx.fillStyle = "#111";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, node.x + 12, node.y);
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>Topics Graph (Tree Layout)</h1>
      {loading ? (
        <div>Loading graph…</div>
      ) : (
        <div style={{ height: "700px", borderRadius: 8, background: "#fff" }}>
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            nodeLabel={n => `${n.title} (${n.id})`}
            nodeCanvasObject={nodeCanvasObject}
            linkDirectionalArrowLength={6}
            linkDirectionalArrowRelPos={1}
            d3VelocityDecay={0.9}
            d3AlphaDecay={1}   // <-- stops the simulation quickly
            d3Force="none"     // <-- disables automatic force layout
          />
        </div>
      )}
    </div>
  );
}
