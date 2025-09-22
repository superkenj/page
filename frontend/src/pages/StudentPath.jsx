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
        const gRes = await fetch(`${API_BASE}/topics/graph/details`);
        const gJson = await gRes.json();
        const nodesBase = (gJson.nodes || []).map(n => ({
          id: n.id,
          title: n.title,
          description: n.description,
          level: typeof n.level === "number" ? n.level : 0
        }));
        const links = (gJson.edges || []).map(e => ({ source: e[0], target: e[1] }));

        const sRes = await fetch(`${API_BASE}/students/${studentId}/path`);
        const sJson = await sRes.json();
        const masteredArr = sJson.mastered || [];
        const recommendedArr = (sJson.recommended || []).map(r => r.id || r);

        // color mapping
        nodesBase.forEach(n => {
          if (masteredArr.includes(n.id)) n.color = "#16a34a";
          else if (recommendedArr.includes(n.id)) n.color = "#f59e0b";
          else n.color = "#d1d5db";
        });

        // layout by level
        const byLevel = {};
        nodesBase.forEach(n => { (byLevel[n.level] = byLevel[n.level]||[]).push(n); });
        const xGap = 260, yGap = 80;
        const positioned = [];
        Object.keys(byLevel).sort((a,b)=>a-b).forEach(levStr => {
          const lev = Number(levStr);
          const group = byLevel[lev];
          const total = (group.length - 1) * yGap;
          group.forEach((node, i) => {
            node.x = lev * xGap;
            node.y = (i * yGap) - (total/2);
            positioned.push(node);
          });
        });

        setGraphData({ nodes: positioned, links });
        setMastered(masteredArr);
        setRecommended(recommendedArr);
        setTimeout(()=> fgRef.current?.zoomToFit(400, 40), 200);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [studentId]);

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
    ctx.fillStyle = node.color || "#cfcfcf";
    ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = "#333"; ctx.stroke();
    ctx.fillStyle = "#111"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const truncated = label.length > 28 ? label.slice(0,28) + '…' : label;
    ctx.fillText(truncated, node.x + 12, node.y);
  };

  async function markAsMastered(topicId) {
    try {
      const res = await fetch(`${API_BASE}/students/${studentId}/mastered`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics: [topicId] })
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Failed");
      }
      // refresh once marked
      const sRes = await fetch(`${API_BASE}/students/${studentId}/path`);
      const sJson = await sRes.json();
      setMastered(sJson.mastered || []);
      setRecommended((sJson.recommended || []).map(r => r.id));
      // refresh graph nodes colors too: quick approach — reload page data
      window.location.reload();
    } catch (err) {
      alert("Could not mark mastered: " + err.message);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Recommended Path — {studentId}</h1>
        <button onClick={() => navigate("/students")}>Back to Students</button>
      </div>

      {loading ? <div>Loading...</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 12 }}>
          <div style={{ height: "720px" }}>
            <ForceGraph2D
              ref={fgRef}
              graphData={graphData}
              nodeLabel={n => `${n.title}\n${n.description}`}
              nodeCanvasObject={nodeCanvasObject}
              enableNodeDrag={false}
              onNodeClick={n => {
                if (confirm(`Mark "${n.title}" as mastered for ${studentId}?`)) markAsMastered(n.id);
              }}
            />
          </div>
          <aside style={{ padding: 12 }}>
            <h3>Mastered</h3>
            <ul>{mastered.length ? mastered.map(m => <li key={m}>{m}</li>) : <li>—</li>}</ul>
            <h3>Recommended</h3>
            <ol>{recommended.length ? recommended.map(r => <li key={r}>{r}</li>) : <li>—</li>}</ol>
            <div style={{ marginTop: 12 }}>
              <strong>Legend</strong>
              <div style={{ display:"flex", gap:8, marginTop:6 }}>
                <div style={{ width:12,height:12,background:"#16a34a" }}></div><div>Mastered</div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <div style={{ width:12,height:12,background:"#f59e0b" }}></div><div>Recommended</div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
