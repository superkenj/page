import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000";

export default function StudentDashboard() {
  const { id: studentId } = useParams();
  const [path, setPath] = useState(null);
  const [topics, setTopics] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!studentId) return;

    async function loadData() {
      const pathRes = await fetch(`${API_BASE}/students/${studentId}/path`);
      const pathJson = await pathRes.json();
      setPath(pathJson);

      const topicRes = await fetch(`${API_BASE}/topics/list`);
      const topicJson = await topicRes.json();
      setTopics(topicJson);
    }

    loadData();
  }, [studentId]);

  if (!path) return <div>Loading...</div>;

  const masteredIds = path.mastered.map((m) => m.id);
  const recommendedIds = path.recommended.map((r) => r.id);

  return (
    <div>
      <h1 style={{ color: "#0f172a", marginBottom: "1.2rem" }}>
        🧩 Let’s Explore Math!
      </h1>
      <p style={{ color: "#475569", marginBottom: "1.5rem" }}>
        Click a card to start learning a topic.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1rem",
        }}
      >
        {topics.map((t, index) => {
          const isMastered = masteredIds.includes(t.id);
          const isRecommended = recommendedIds.includes(t.id);

          const bgColor = isMastered
            ? "#bbf7d0"
            : isRecommended
            ? "#fde68a"
            : "#f1f5f9";

          const icons = ["➕", "➗", "📐", "📏", "🧮"];
          const mathIcon = icons[index % icons.length];

          return (
            <div
              key={t.id}
              onClick={() =>
                navigate(`/student-dashboard/${studentId}/topic/${t.id}`)
              }
              style={{
                background: bgColor,
                padding: "1rem",
                borderRadius: "12px",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                position: "relative",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow =
                  "0 4px 10px rgba(0,0,0,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow =
                  "0 2px 6px rgba(0,0,0,0.1)";
              }}
            >
              <span
                style={{
                  fontSize: "2rem",
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  opacity: 0.3,
                }}
              >
                {mathIcon}
              </span>
              <h3 style={{ marginBottom: "0.5rem", color: "#0f172a" }}>
                {t.name}
              </h3>
              <p
                style={{
                  color: "#475569",
                  fontSize: "0.9rem",
                  marginBottom: "0.5rem",
                }}
              >
                {t.description || "No description available."}
              </p>

              <div style={{ marginTop: "6px" }}>
                {isMastered && (
                  <span
                    style={{
                      background: "#16a34a",
                      color: "white",
                      fontSize: "0.8rem",
                      padding: "4px 8px",
                      borderRadius: "8px",
                      fontWeight: "bold",
                    }}
                  >
                    ✅ Mastered
                  </span>
                )}
                {isRecommended && (
                  <span
                    style={{
                      background: "#f59e0b",
                      color: "white",
                      fontSize: "0.8rem",
                      padding: "4px 8px",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      marginLeft: "6px",
                    }}
                  >
                    ⭐ Recommended
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
