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
  const [seen, setSeen] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAll() {
      try {
        const [topicRes, pathRes, stuRes] = await Promise.all([
          fetch(`${API_BASE}/topics/list`),
          fetch(`${API_BASE}/students/${id}/path`),
          fetch(`${API_BASE}/students/${id}`),
        ]);

        const tJson = await topicRes.json();
        const pJson = await pathRes.json();
        const sJson = await stuRes.json();

        setTopics(Array.isArray(tJson) ? tJson : tJson.topics || []);
        setSeen(sJson.content_seen || []);

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

  function getCardColor(topicId) {
    if (path.mastered.some((t) => t.id === topicId)) return "#dcfce7";
    if (path.recommended.some((t) => t.id === topicId)) return "#fef9c3";
    if (path.inProgress.some((t) => t.id === topicId)) return "#dbeafe";
    return "#f3f4f6";
  }

  function getCardBorder(topicId) {
    if (path.mastered.some((t) => t.id === topicId)) return "2px solid #16a34a";
    if (path.recommended.some((t) => t.id === topicId)) return "2px solid #ca8a04";
    if (path.inProgress.some((t) => t.id === topicId)) return "2px solid #2563eb";
    return "1px solid #e5e7eb";
  }

  function getStatus(topicId) {
    if (path.mastered.some((t) => t.id === topicId)) return "Mastered";
    if (path.inProgress.some((t) => t.id === topicId)) return "In Progress";
    if (path.recommended.some((t) => t.id === topicId)) return "Recommended";
    return "Upcoming";
  }

  function getStatusColor(status) {
    switch (status) {
      case "Recommended":
        return "#facc15";
      case "Mastered":
        return "#16a34a";
      case "In Progress":
        return "#3b82f6";
      default:
        return "#9ca3af";
    }
  }

  // fix sorting (Recommended → In Progress → Mastered → Upcoming)
  function getSortedTopics() {
    const allTopics = topics.map((t) => ({
      ...t,
      category: getStatus(t.id),
    }));

    const order = {
      Recommended: 1,
      "In Progress": 2,
      Mastered: 3,
      Upcoming: 4,
    };

    return allTopics.sort((a, b) => order[a.category] - order[b.category]);
  }

  const sortedTopics = getSortedTopics();

  if (loading) return <div style={{ padding: 20 }}>Loading dashboard...</div>;

  return (
    <div style={{ padding: "20px 40px" }}>
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
        {sortedTopics.map((topic) => {
          const status = getStatus(topic.id);
          const labelColor = getStatusColor(status);

          return (
            <div
              key={topic.id}
              onClick={() => navigate(`/student-dashboard/${id}/topic/${topic.id}`)}
              style={{
                background: getCardColor(topic.id),
                border: getCardBorder(topic.id),
                borderRadius: 10,
                padding: 16,
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                position: "relative",
                transition: "transform 0.2s ease",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  background: labelColor,
                  color: "white",
                  fontSize: 12,
                  fontWeight: "bold",
                  padding: "3px 8px",
                  borderRadius: "12px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                }}
              >
                {status}
              </div>

              <h3 style={{ marginBottom: 8 }}>{topic.name}</h3>
              <p style={{ fontSize: 14, color: "#374151" }}>
                {topic.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
