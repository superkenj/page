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

  useEffect(() => {
    async function loadAll() {
      try {
        // Load topics
        const tRes = await fetch(`${API_BASE}/topics/list`);
        const tJson = await tRes.json();
        setTopics(Array.isArray(tJson) ? tJson : tJson.topics || []);

        // Load student learning path
        const pRes = await fetch(`${API_BASE}/students/${id}/path`);
        const pJson = await pRes.json();

        setPath({
          mastered: Array.isArray(pJson.mastered) ? pJson.mastered : [],
          recommended: Array.isArray(pJson.recommended) ? pJson.recommended : [],
          inProgress: Array.isArray(pJson.inProgress) ? pJson.inProgress : [],
          upcoming: Array.isArray(pJson.upcoming) ? pJson.upcoming : [],
        });
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [id]);

  // ✅ Corrected color logic for object arrays
  function getCardColor(topicId) {
    if (path.mastered.some((t) => t.id === topicId)) return "#dcfce7"; // green
    if (path.recommended.some((t) => t.id === topicId)) return "#fef3c7"; // yellow
    if (path.inProgress.some((t) => t.id === topicId)) return "#dbeafe"; // blue
    return "#f9fafb"; // gray
  }

  function getCardBorder(topicId) {
    if (path.mastered.some((t) => t.id === topicId)) return "2px solid #16a34a";
    if (path.recommended.some((t) => t.id === topicId)) return "2px solid #ca8a04";
    if (path.inProgress.some((t) => t.id === topicId)) return "2px solid #2563eb";
    return "1px solid #e5e7eb";
  }

  // ✅ Clicking a card opens topic content page
  function handleTopicClick(topicId) {
    navigate(`/students/${id}/content/${topicId}`);
  }

  if (loading) return <div style={{ padding: 20 }}>Loading dashboard...</div>;

  return (
    <div style={{ padding: "40px 60px" }}>
      <h1 style={{ marginBottom: 12 }}>🧩 Let’s Explore Math!</h1>
      <p style={{ marginBottom: 32 }}>
        Click a card to start learning a topic.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {topics.map((topic) => (
          <div
            key={topic.id}
            onClick={() => handleTopicClick(topic.id)}
            style={{
              background: getCardColor(topic.id),
              border: getCardBorder(topic.id),
              borderRadius: 10,
              padding: 16,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.03)";
              e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
            }}
          >
            <h3 style={{ marginBottom: 8 }}>{topic.name}</h3>
            <p style={{ fontSize: 14, color: "#374151" }}>
              {topic.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
