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
        const tRes = await fetch(`${API_BASE}/topics/list`);
        const tJson = await tRes.json();
        setTopics(Array.isArray(tJson) ? tJson : tJson.topics || []);

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

  // ✅ Color and border logic
  function getCardColor(topicId) {
    if (path.mastered.some((t) => t.id === topicId)) return "#dcfce7"; // green
    if (path.recommended.some((t) => t.id === topicId)) return "#fef9c3"; // yellow
    if (path.inProgress.some((t) => t.id === topicId)) return "#dbeafe"; // blue
    return "#f3f4f6"; // gray
  }

  function getCardBorder(topicId) {
    if (path.mastered.some((t) => t.id === topicId)) return "2px solid #16a34a";
    if (path.recommended.some((t) => t.id === topicId)) return "2px solid #ca8a04";
    if (path.inProgress.some((t) => t.id === topicId)) return "2px solid #2563eb";
    return "1px solid #e5e7eb";
  }

  function getStatus(topicId) {
    if (path.recommended.some((t) => t.id === topicId)) return "Recommended";
    if (path.mastered.some((t) => t.id === topicId)) return "Mastered";
    if (path.inProgress.some((t) => t.id === topicId)) return "In Progress";
    return "Upcoming";
  }

  function getStatusColor(status) {
    switch (status) {
      case "Recommended":
        return "#facc15"; // yellow
      case "Mastered":
        return "#16a34a"; // green
      case "In Progress":
        return "#3b82f6"; // blue
      default:
        return "#9ca3af"; // gray
    }
  }

  function handleTopicClick(topicId) {
    navigate(`/student-dashboard/${id}/topic/${topicId}`);
  }

  function handleLogout() {
    localStorage.clear();
    navigate("/");
  }

  // 🧩 Sort topics by category priority
  function getSortedTopics() {
    const allTopics = topics.map((t) => ({
      ...t,
      category: path.recommended.some((x) => x.id === t.id)
        ? "recommended"
        : path.mastered.some((x) => x.id === t.id)
        ? "mastered"
        : path.inProgress.some((x) => x.id === t.id)
        ? "inProgress"
        : "upcoming",
    }));

    const order = { recommended: 1, mastered: 2, inProgress: 3, upcoming: 4 };
    return allTopics.sort((a, b) => order[a.category] - order[b.category]);
  }

  if (loading) return <div style={{ padding: 20 }}>Loading dashboard...</div>;

  const sortedTopics = getSortedTopics();

  return (
    <div style={{ position: "relative", padding: "80px 60px 40px" }}>
      {/* 🔵 Fixed Top Bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          background: "#2563eb",
          color: "white",
          padding: "16px 60px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
          zIndex: 100,
        }}
      >
        <h2 style={{ margin: 0 }}>🧩 Let’s Explore Math!</h2>
        <button
          onClick={handleLogout}
          style={{
            background: "#f87171",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            cursor: "pointer",
            fontWeight: "bold",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          Logout
        </button>
      </div>

      {/* 🟡 Dashboard Content */}
      <p style={{ marginBottom: 32, marginTop: 10 }}>
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
              {/* 🔖 Status Label */}
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

              {/* 🧠 Topic Content */}
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
