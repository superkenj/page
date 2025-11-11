// frontend/src/components/StudentSidebar.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const API_BASE = "https://page-jirk.onrender.com";

export default function StudentSidebar() {
  const { id } = useParams();
  const [path, setPath] = useState({
    mastered: [],
    recommended: [],
  });
  const [topics, setTopics] = useState([]);

  useEffect(() => {
    async function loadSidebarData() {
      try {
        const tRes = await fetch(`${API_BASE}/topics/list`);
        const tJson = await tRes.json();
        setTopics(Array.isArray(tJson) ? tJson : tJson.topics || []);

        const pRes = await fetch(`${API_BASE}/students/${id}/path`);
        const pJson = await pRes.json();
        setPath({
          mastered: pJson.mastered || [],
          recommended: pJson.recommended || [],
        });
      } catch (err) {
        console.error("Sidebar data load error:", err);
      }
    }
    loadSidebarData();
  }, [id]);

  const masteredCount = path.mastered.length;
  const totalTopics = topics.length;
  const progressPercent =
    totalTopics > 0 ? Math.round((masteredCount / totalTopics) * 100) : 0;

  return (
    <div
      style={{
        width: 280,
        background: "#2563eb",
        color: "white",
        padding: "24px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <img
        src="https://cdn-icons-png.flaticon.com/512/201/201818.png"
        alt="Student Avatar"
        style={{
          width: 90,
          height: 90,
          borderRadius: "50%",
          marginBottom: 12,
          border: "3px solid #fff",
        }}
      />
      <h3>Hello!</h3>
      <p style={{ textAlign: "center", fontSize: 14, color: "#e0e7ff" }}>
        Keep up the great work! 🌟
      </p>

      <div style={{ marginTop: 24, width: "100%" }}>
        <h4>Your Progress</h4>
        <div
          style={{
            background: "#1e3a8a",
            borderRadius: 6,
            height: 8,
            marginBottom: 6,
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              background: "#22c55e",
              borderRadius: 6,
            }}
          ></div>
        </div>
        <p style={{ fontSize: 13 }}>{progressPercent}% Complete</p>
      </div>

      <div style={{ marginTop: 24, width: "100%" }}>
        <h4>⭐ Recommended Topics</h4>
        {path.recommended.length ? (
          <ul style={{ fontSize: 14, color: "#e0e7ff" }}>
            {path.recommended.map((r) => (
              <li key={r}>• {r}</li>
            ))}
          </ul>
        ) : (
          <p style={{ fontSize: 13, color: "#cbd5e1" }}>
            No recommendations yet.
          </p>
        )}
      </div>
    </div>
  );
}
