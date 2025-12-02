// frontend/src/teacher/TopicsGraph.jsx
import React, { useEffect, useState, useRef } from "react";
import { ForceGraph2D } from "react-force-graph";

const API_BASE = "https://page-jirk.onrender.com";

export default function TopicsGraph() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const fgRef = useRef();

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "teacher") navigate("/");
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/topics/graph/details`);
        const json = await res.json();
        if (json.error) { console.error(json); setGraphData({nodes:[],links:[]}); return; }

        const nodes = (json.nodes || []).map(n => ({
          id: n.id,
          title: n.title,
          description: n.description,
          cluster: n.cluster,
          level: typeof n.level === "number" ? n.level : 0
        }));

        const links = (json.edges || []).map(e => ({ source: e[0], target: e[1] }));

        // layout: assign x,y based on level
        const byLevel = {};
        nodes.forEach(n => { (byLevel[n.level] = byLevel[n.level]||[]).push(n); });

        const xGap = 260; // horizontal spacing
        const yGap = 80;  // vertical spacing
        const positioned = [];
        Object.keys(byLevel).sort((a,b)=>a-b).forEach((levStr) => {
          const lev = Number(levStr);
          const group = byLevel[lev];
          const total = (group.length - 1) * yGap;
          group.forEach((node, i) => {
            node.x = lev * xGap;
            node.y = (i * yGap) - (total / 2);
            positioned.push(node);
          });
        });

        setGraphData({ nodes: positioned, links });
        setTimeout(()=> fgRef.current?.zoomToFit(400, 30), 200);
      } catch (err) {
        console.error("Failed to load graph:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!fgRef.current) return;
    try {
      fgRef.current.d3Force('charge', null);
      fgRef.current.d3Force('link', null);
      fgRef.current.d3Force('center', null);
    } catch(e) {}
  }, [graphData]);

  const nodeCanvasObject = (node, ctx, globalScale) => {
    const label = node.title || node.id;
    const fontSize = 12 / globalScale;
    ctx.font = `${Math.max(fontSize, 8)}px Sans-Serif`;
    ctx.beginPath();
    ctx.arc(node.x, node.y, 10, 0, 2*Math.PI, false);
    ctx.fillStyle = "#93c5fd";
    ctx.fill();
    ctx.strokeStyle = "#333"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "#111"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const truncated = label.length > 30 ? label.slice(0,30) + "…" : label;
    ctx.fillText(truncated, node.x + 14, node.y);
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>Topics Graph</h1>
      {loading ? <div>Loading...</div> : (
        <div style={{ height: "720px", background: "#fff", borderRadius: 8 }}>
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            nodeLabel={n => `${n.title}\n${n.description}`}
            nodeCanvasObject={nodeCanvasObject}
            enableNodeDrag={false}
            cooldownTicks={0}
            linkWidth={1}
            linkColor={() => '#bdbdbd'}
            onNodeClick={n => alert(`${n.title}\n\n${n.description}`)}
          />
        </div>
      )}
    </div>
  );
}
