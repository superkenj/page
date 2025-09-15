// frontend/src/pages/StudentPath.jsx
import React, { useEffect, useState, useRef } from "react";
import { ForceGraph2D } from "react-force-graph";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000";

export default function StudentPath() {
  const { id: studentId } = useParams();
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [mastered, setMastered] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const fgRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // fetch graph details
        const gRes = await fetch(`${API_BASE}/topics/graph/details`);
        const gJson = await gRes.json();
        if (gJson.error) {
          console.error("Graph error", gJson);
        }
        const nodes = (gJson.nodes || []).map(n => ({
          id: n.id,
          title: n.title ?? n.name ?? n.id
        }));
        const links = (gJson.edges || []).map(e => ({ source: e[0], target: e[1] }));

        // fetch student path
        const sRes = await fetch(`${API_BASE}/students/${studentId}/path`);
        const sJson = await sRes.json();
        if (sJson.error) {
          console.error("Student path error:", sJson);
        }
        const masteredArr = sJson.mastered || [];
        const recommendedArr = (sJson.recommended || []).map(r => r.id);

        // color nodes: mastered green, recommended orange, others gray
        const coloredNodes = nodes.map(n => {
          if (masteredArr.includes(n.id)) return { ...n, color: "#16a34a" }; // green
          if (recommendedArr.includes(n.id)) return { ...n, color: "#f59e0b" }; // orange
          return { ...n, color: "#d1d5db" }; // light gray
        });

        setGraphData({ nodes: coloredNodes, links });
        setMastered(masteredArr);
        setRecommended(recommendedArr);
        setTimeout(() => fgRef.current?.zoomToFit(400, 50), 200);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [studentId]);

  async function markAsMastered(topicId) {
    try {
      const res = await fetch(`${API_BASE}/students/${studentId}/mastered`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics: [topicId] })
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Failed to mark mastered");
      }
      // reload data
      // small optimization: update local state
      setMastered(prev => Array.from(new Set([...prev, topicId])));
      setGraphData(g => ({
        ...g,
        nodes: g.nodes.map(n => n.id === topicId ? { ...n, color: "#16a34a" } : n)
      }));
      // refresh recommended list and graph by re-fetching
      const sRes = await fetch(`${API_BASE}/students/${studentId}/path`);
      const sJson = await sRes.json();
      setRecommended((sJson.recommended || []).map(r => r.id));
    } catch (err) {
      console.error(err);
      alert("Could not mark as mastered: " + err.message);
    }
  }

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
    // draw a small badge if recommended
    if (recommended.includes(node.id)) {
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(node.x + 8, node.y - 12, 5, 0, 2 * Math.PI, false);
      ctx.fill();
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1>Recommended Path — {studentId}</h1>
        <div>
          <button onClick={() => navigate("/students")}>Back to Students</button>
        </div>
      </div>

      {loading ? (
        <div>Loading student path & graph…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 12 }}>
          <div style={{ height: "720px", background: "#fff", borderRadius: 8 }}>
            <ForceGraph2D
              ref={fgRef}
              graphData={graphData}
              nodeLabel={n => `${n.title} (${n.id})`}
              nodeCanvasObject={nodeCanvasObject}
              linkDirectionalArrowLength={6}
              linkDirectionalArrowRelPos={1}
              onNodeClick={(node) => {
                // allow quick mastery toggle or open details
                if (window.confirm(`Mark "${node.title}" as mastered for ${studentId}?`)) {
                  markAsMastered(node.id);
                }
              }}
            />
          </div>

          <div style={{ padding: 12 }}>
            <h3>Mastered</h3>
            <ul>
              {mastered.length ? mastered.map(m => <li key={m}>{m}</li>) : <li>—</li>}
            </ul>

            <h3>Recommended Next</h3>
            <ol>
              {recommended.length ? recommended.map(r => (
                <li key={r}>
                  {r}
                  <div style={{ marginTop: 6 }}>
                    <button onClick={() => markAsMastered(r)}>Mark as mastered</button>
                  </div>
                </li>
              )) : <li>—</li>}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
