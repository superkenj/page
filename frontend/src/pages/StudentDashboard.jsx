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
        const tRes = await fetch(`${API_BASE}/topics/list`);
        const tJson = await tRes.json();
        const allTopics = Array.isArray(tJson) ? tJson : tJson.topics || [];
        setTopics(allTopics);

        const pRes = await fetch(`${API_BASE}/students/${id}/path`);
        const pJson = await pRes.json();

        // ✅ Handle missing recommended for new students
        let recommended = Array.isArray(pJson.recommended)
          ? pJson.recommended
          : [];

        if (recommended.length === 0 && allTopics.length > 0) {
          // show topics with no prerequisites
          recommended = allTopics.filter(
            (t) =>
              !pJson.mastered?.some((m) => m.id === t.id) &&
              (!t.prerequisites || t.prerequisites.length === 0)
          );
        }

        setPath({
          mastered: Array.isArray(pJson.mastered) ? pJson.mastered : [],
          recommended,
          inProgress: Array.isArray(pJson.inProgress)
            ? pJson.inProgress
            : [],
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

  // ✅ Card Colors & Borders
  function getCardColor(topicId) {
    if (path.mastered.some((t) => t.id === topicId)) return "#dcfce7"; // green
    if (path.inProgress.some((t) => t.id === topicId)) return "#dbeafe"; // blue
    if (path.recommended.some((t) => t.id === topicId)) return "#fef9c3"; // yellow
    return "#f3f4f6"; // gray
  }

  function getCardBorder(topicId) {
    if (path.mastered.some((t) => t.id === topicId)) return "2px solid #16a34a";
    if (path.inProgress.some((t) => t.id === topicId)) return "2px solid #2563eb";
    if (path.recommended.some((t) => t.id === topicId)) return "2px solid #ca8a04";
    return "1px solid #e5e7eb";
  }

  // ✅ Card Status
  function getStatus(topicId) {
    if (path.inProgress.some((t) => t.id === topicId)) return "In Progress";
    if (path.recommended.some((t) => t.id === topicId)) return "Recommended";
    if (path.mastered.some((t) => t.id === topicId)) return "Mastered";
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

  // ✅ Sort Order (In Progress → Recommended → Mastered → Upcoming)
  function getSortedTopics() {
    const allTopics = topics.map((t) => ({
      ...t,
      category: path.inProgress.some((x) => x.id === t.id)
        ? "inProgress"
        : path.recommended.some((x) => x.id === t.id)
        ? "recommended"
        : path.mastered.some((x) => x.id === t.id)
        ? "mastered"
        : "upcoming",
    }));

    const order = { inProgress: 1, recommended: 2, mastered: 3, upcoming: 4 };
    return allTopics.sort((a, b) => order[a.category] - order[b.category]);
  }

  function handleTopicClick(topicId) {
    navigate(`/student-dashboard/${id}/topic/${topicId}`);
  }

  if (loading) return <div style={{ padding: 20 }}>Loading dashboard...</div>;

  const sortedTopics = getSortedTopics();

  return (
    <div style={{ padding: "40px 60px" }}>
      {/* 💬 Updated Guidance Message */}
      <div
        style={{
          background: "linear-gradient(90deg, #3b82f6, #06b6d4)",
          color: "white",
          padding: "12px 20px",
          borderRadius: 10,
          fontWeight: "bold",
          textAlign: "center",
          marginBottom: 24,
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          fontSize: 18,
        }}
      >
        💬 Choose a recommended card to start your learning adventure!
      </div>

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
              onClick={() => handleTopicClick(topic.id)}
              style={{
                background: getCardColor(topic.id),
                border: getCardBorder(topic.id),
                borderRadius: 10,
                padding: 16,
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                position: "relative",
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
              {/* Status Label */}
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
