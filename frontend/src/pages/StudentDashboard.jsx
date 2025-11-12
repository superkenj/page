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
  const [quote, setQuote] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAll() {
      try {
        const [tRes, pRes] = await Promise.all([
          fetch(`${API_BASE}/topics/list`),
          fetch(`${API_BASE}/students/${id}/path`),
        ]);

        const tJson = await tRes.json();
        const pJson = await pRes.json();

        setTopics(Array.isArray(tJson) ? tJson : tJson.topics || []);
        setPath({
          mastered: pJson.mastered || [],
          recommended: pJson.recommended || [],
          inProgress: pJson.inProgress || [],
          upcoming: pJson.upcoming || [],
        });

        const quotes = [
          "Mathematics is the language of the universe!",
          "Every problem has a solution — let’s find it!",
          "Mistakes mean you’re trying, and that’s what matters!",
          "Learning is your superpower! 💪",
        ];
        setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
    window.addEventListener("contentSeenUpdated", loadAll);
    return () => window.removeEventListener("contentSeenUpdated", loadAll);
  }, [id]);

  function getStatus(topicId) {
    if (path.mastered.some((t) => t.id === topicId)) return "Mastered";
    if (path.inProgress.some((t) => t.id === topicId)) return "In Progress";
    if (path.recommended.some((t) => t.id === topicId)) return "Recommended";
    return "Upcoming";
  }

  function getCardColor(topicId) {
    const status = getStatus(topicId);
    switch (status) {
      case "Mastered":
        return "#dcfce7";
      case "In Progress":
        return "#dbeafe";
      case "Recommended":
        return "#fef9c3";
      default:
        return "#f3f4f6";
    }
  }

  if (loading) return <div>Loading dashboard...</div>;

  const order = { Recommended: 1, "In Progress": 2, Mastered: 3, Upcoming: 4 };
  const sorted = [...topics].sort(
    (a, b) => order[getStatus(a.id)] - order[getStatus(b.id)]
  );

  return (
    <div style={{ padding: "20px 40px" }}>
      <h2
        style={{
          textAlign: "center",
          marginBottom: 32,
          background: "linear-gradient(90deg,#3b82f6,#06b6d4)",
          color: "white",
          padding: "10px 20px",
          borderRadius: 10,
          boxShadow: "0 3px 6px rgba(0,0,0,0.15)",
        }}
      >
        💬 “{quote}”
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {sorted.map((t) => {
          const status = getStatus(t.id);
          const color =
            status === "Mastered"
              ? "#16a34a"
              : status === "In Progress"
              ? "#3b82f6"
              : status === "Recommended"
              ? "#facc15"
              : "#9ca3af";

          return (
            <div
              key={t.id}
              onClick={() => navigate(`/student-dashboard/${id}/topic/${t.id}`)}
              style={{
                background: getCardColor(t.id),
                border: `2px solid ${color}`,
                borderRadius: 10,
                padding: 16,
                cursor: "pointer",
                position: "relative",
                transition: "transform 0.2s",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  background: color,
                  color: "white",
                  fontSize: 12,
                  fontWeight: "bold",
                  padding: "3px 8px",
                  borderRadius: "12px",
                }}
              >
                {status}
              </div>
              <h3 style={{ marginBottom: 8 }}>{t.name}</h3>
              <p style={{ fontSize: 14, color: "#374151" }}>{t.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
