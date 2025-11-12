// frontend/src/pages/StudentDashboard.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "https://page-jirk.onrender.com";

export default function StudentDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [path, setPath] = useState({
    mastered: [],
    recommended: [],
    inProgress: [],
    upcoming: [],
  });
  const [loading, setLoading] = useState(true);

  async function fetchPath() {
    try {
      const res = await fetch(`${API_BASE}/students/${id}/path`);
      const data = await res.json();
      setPath({
        mastered: data.mastered || [],
        recommended: data.recommended || [],
        inProgress: data.inProgress || [],
        upcoming: data.upcoming || [],
      });
    } catch (e) {
      console.error("Path fetch failed:", e);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const tRes = await fetch(`${API_BASE}/topics/list`);
        const tJson = await tRes.json();
        setTopics(Array.isArray(tJson) ? tJson : tJson.topics || []);
        await fetchPath(); // ✅ load once
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // ✅ refresh path when “Mark as Seen” is clicked in content
  useEffect(() => {
    window.addEventListener("contentSeenUpdated", fetchPath);
    return () => window.removeEventListener("contentSeenUpdated", fetchPath);
  }, []);

  function getCardColor(topicId) {
    if (path.mastered.some((t) => t.id === topicId)) return "#dcfce7";
    if (path.inProgress.some((t) => t.id === topicId)) return "#dbeafe";
    if (path.recommended.some((t) => t.id === topicId)) return "#fef9c3";
    return "#f3f4f6";
  }

  function getStatus(topicId) {
    if (path.mastered.some((t) => t.id === topicId)) return "Mastered";
    if (path.inProgress.some((t) => t.id === topicId)) return "In Progress";
    if (path.recommended.some((t) => t.id === topicId)) return "Recommended";
    return "Upcoming";
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: "20px 40px" }}>
      <p>Click a card to start learning a topic.</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {topics.map((topic) => {
          const status = getStatus(topic.id);
          return (
            <div
              key={topic.id}
              onClick={() => navigate(`/student-dashboard/${id}/topic/${topic.id}`)}
              style={{
                background: getCardColor(topic.id),
                border: "2px solid rgba(0,0,0,0.1)",
                borderRadius: 10,
                padding: 16,
                cursor: "pointer",
                position: "relative",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  background:
                    status === "Mastered"
                      ? "#16a34a"
                      : status === "In Progress"
                      ? "#3b82f6"
                      : status === "Recommended"
                      ? "#facc15"
                      : "#9ca3af",
                  color: "white",
                  fontSize: 12,
                  fontWeight: "bold",
                  padding: "3px 8px",
                  borderRadius: "12px",
                }}
              >
                {status}
              </span>
              <h3>{topic.name}</h3>
              <p>{topic.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
