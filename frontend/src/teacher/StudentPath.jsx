import React, { useEffect, useState, useRef } from "react";
import { ForceGraph2D } from "react-force-graph";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "https://page-jirk.onrender.com";

export default function StudentPath() {
  const { id: studentId } = useParams();
  const [studentName, setStudentName] = useState("");
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [mastered, setMastered] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const fgRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "teacher") navigate("/");
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Fetch topic graph
        const gRes = await fetch(`${API_BASE}/topics/graph`);
        const gJson = await gRes.json();
        const nodesBase = (gJson.nodes || []).map((n) => ({
          id: n.id,
          title: n.title,
          description: n.description,
          level: typeof n.level === "number" ? n.level : 0,
        }));
        const links = (gJson.edges || []).map((e) => ({
          source: e[0],
          target: e[1],
        }));

        // Fetch student path
        const sRes = await fetch(`${API_BASE}/students/${studentId}/path`);
        const sJson = await sRes.json();
        setStudentName(sJson?.student?.name || "");

        const masteredArr = sJson.mastered || [];
        let recommendedArr = sJson.recommended || [];

        // Clean duplicates
        const masteredIds = masteredArr.map((m) => m.id);

        setMastered(masteredArr);
        setRecommended(recommendedArr);

        // Color code nodes
        nodesBase.forEach((n) => {
          if (masteredIds.includes(n.id)) n.color = "#16a34a";
          else if (recommendedArr.some((r) => r.id === n.id)) n.color = "#f59e0b";
          else n.color = "#d1d5db";
        });

        // Position nodes by level
        const byLevel = {};
        nodesBase.forEach((n) => {
          (byLevel[n.level] = byLevel[n.level] || []).push(n);
        });
        const xGap = 260,
          yGap = 80;
        const positioned = [];
        Object.keys(byLevel)
          .sort((a, b) => a - b)
          .forEach((levStr) => {
            const lev = Number(levStr);
            const group = byLevel[lev];
            const total = (group.length - 1) * yGap;
            group.forEach((node, i) => {
              node.x = lev * xGap;
              node.y = i * yGap - total / 2;
              positioned.push(node);
            });
          });

        setGraphData({ nodes: positioned, links });
        setTimeout(() => fgRef.current?.zoomToFit(400, 40), 300);
      } catch (e) {
        console.error("Error loading graph or student path:", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [studentId]);

  useEffect(() => {
    if (!fgRef.current) return;
    try {
      fgRef.current.d3Force("charge", null);
      fgRef.current.d3Force("link", null);
      fgRef.current.d3Force("center", null);
    } catch (e) {}
  }, [graphData]);

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
    const truncated = label.length > 28 ? label.slice(0, 28) + "…" : label;
    ctx.fillText(truncated, node.x + 12, node.y);
  };

  async function markAsMastered(topicId) {
    try {
      const res = await fetch(`${API_BASE}/students/${studentId}/mastered`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics: [topicId] }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Failed");
      }
      // reload data after update
      window.location.reload();
    } catch (err) {
      alert("Could not mark mastered: " + err.message);
    }
  }

  return (
    <div style={{ padding: "1.5rem" }}>
      <h1>Recommended Path — {studentName || studentId}</h1>

      <button
        onClick={() => navigate("/teacher/students")}
        style={{
          margin: "12px 0",
          background: "#3b82f6",
          color: "white",
          border: "none",
          padding: "8px 14px",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        ← Back to Students
      </button>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {/* Info Row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "nowrap",
              marginBottom: "1.5rem",
              width: "100%",
            }}
          >

            {/* Mastered */}
            <div
              style={{
                background: "#f3f4f6",
                padding: "1rem",
                borderRadius: "10px",
                flex: 1,
                minWidth: "280px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              }}
            >
              <h3 style={{ marginTop: 0 }}>Mastered Topics</h3>
              {mastered.length ? (
                <ul style={{ padding: 0, listStyle: "none" }}>
                  {mastered.map((m) => (
                    <li key={m.id} style={{ marginBottom: 6 }}>
                      <strong>{m.title}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No mastered topics yet.</p>
              )}
            </div>

            {/* Recommended */}
            <div
              style={{
                background: "#fff7e6",
                padding: "1rem",
                borderRadius: "10px",
                flex: 1,
                minWidth: "280px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              }}
            >
              <h3 style={{ marginTop: 0 }}>Recommended Next</h3>
              {recommended.length ? (
                <ul style={{ padding: 0, listStyle: "none" }}>
                  {recommended.map((r) => (
                    <li
                      key={r.id}
                      onClick={() => navigate(`/teacher/content/${r.id}`)}
                      style={{ cursor: "pointer", marginBottom: 6 }}
                    >
                      <strong>{r.title}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No recommended topics yet.</p>
              )}
            </div>

            {/* Legend */}
            <div
              style={{
                background: "#eef2ff",
                padding: "1rem",
                borderRadius: "10px",
                flex: "0 0 200px",
                maxWidth: "200px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              }}
            >
              <h3 style={{ marginTop: 0 }}>Legend</h3>

              <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                <div style={{ width: 14, height: 14, background: "#16a34a", borderRadius: 3 }} />
                <span style={{ marginLeft: 8 }}>Mastered</span>
              </div>

              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ width: 14, height: 14, background: "#f59e0b", borderRadius: 3 }} />
                <span style={{ marginLeft: 8 }}>Recommended</span>
              </div>
            </div>

          </div>

          {/* Graph Visualization */}
          <div style={{ height: "700px", background: "#fff" }}>
            <ForceGraph2D
              ref={fgRef}
              graphData={graphData}
              nodeLabel={(n) => `${n.title}\n${n.description}`}
              nodeCanvasObject={nodeCanvasObject}
              enableNodeDrag={false}
              onNodeClick={(n) => {
                if (
                  window.confirm(
                    `Mark "${n.title}" as mastered for ${studentId}?`
                  )
                ) {
                  markAsMastered(n.id);
                }
              }}
            />
          </div>
        </div>
      )}

      <button
        onClick={() => navigate("/teacher/students")}
        style={{
          marginTop: "1.5rem",
          background: "#3b82f6",
          color: "white",
          border: "none",
          padding: "8px 14px",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        ← Back to Students
      </button>
    </div>
  );
}
