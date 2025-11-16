// frontend/src/layout/StudentSidebar.jsx
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
    <div>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("openStudentFeedbackModal"))}
        style={{
          background: "#0ea5e9",
          color: "white",
          border: "none",
          padding: "12px",
          borderRadius: "6px",
          width: "100%",
          marginTop: "20px",
          cursor: "pointer"
        }}
      >
        💬 Feedback
      </button>
    </div>
  );
}
