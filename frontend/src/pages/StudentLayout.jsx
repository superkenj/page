// frontend/src/pages/StudentLayout.jsx
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

const API_BASE = "https://page-jirk.onrender.com";

export default function StudentLayout() {
  const { id } = useParams(); // 👈 ensures correct ID reference
  const [student, setStudent] = useState(null);
  const [topics, setTopics] = useState([]);
  const [mastered, setMastered] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [quote, setQuote] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const stuRes = await fetch(`${API_BASE}/students/${id}`);
        const stuJson = await stuRes.json();
        setStudent(stuJson);

        const masteredTopics = stuJson.mastered || [];
        setMastered(masteredTopics);

        const topicRes = await fetch(`${API_BASE}/topics/list`);
        const topicsJson = await topicRes.json();
        const allTopics = Array.isArray(topicsJson)
          ? topicsJson
          : topicsJson.topics || [];
        setTopics(allTopics);

        const computed = computeRecommended(allTopics, masteredTopics);
        setRecommended(computed);
      } catch (err) {
        console.error("Error loading student layout:", err);
      }
    }

    loadData();

    const quotes = [
      "Mathematics is the language of the universe!",
      "Every problem has a solution — let’s find it!",
      "Mistakes mean you’re trying, and that’s what matters!",
      "Learning is your superpower! 💪",
    ];
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, [id]);

  function computeRecommended(allTopics, masteredList) {
    const masteredSet = new Set(masteredList);
    return allTopics
      .filter(
        (topic) =>
          !masteredSet.has(topic.id) &&
          topic.prerequisites?.every((p) => masteredSet.has(p))
      )
      .map((t) => ({ id: t.id, name: t.name }));
  }

  const progressPercent =
    topics.length > 0
      ? Math.round((mastered.length / topics.length) * 100)
      : 0;

  const avatarUrl =
    student?.gender === "male"
      ? "https://cdn-icons-png.flaticon.com/512/4140/4140048.png"
      : "https://cdn-icons-png.flaticon.com/512/706/706830.png";

  function handleLogout() {
    localStorage.removeItem("studentId");
    localStorage.removeItem("role");
    navigate("/");
  }

  return (
    <div style={{ display: "flex", background: "#f0f9ff", minHeight: "100vh" }}>
      <aside
        style={{
          width: 280,
          background: "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)",
          color: "white",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100vh",
          overflowY: "auto", // ✅ fixes logout cutoff
        }}
      >
        <div>
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <img
              src={avatarUrl}
              alt="avatar"
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                marginBottom: "10px",
                border: "3px solid white",
              }}
            />
            <h2 style={{ margin: 0, fontSize: "1.3rem" }}>
              {student ? `Hi, ${student.name}!` : "Hello!"}
            </h2>
            <p style={{ fontSize: "0.9rem", opacity: 0.9 }}>
              Keep up the great work! 🌟
            </p>
          </div>

          {/* Progress */}
          <div style={{ marginBottom: "1.5rem" }}>
            <p style={{ fontWeight: "bold" }}>Your Progress</p>
            <div
              style={{
                background: "rgba(255,255,255,0.3)",
                borderRadius: "10px",
                height: 14,
                overflow: "hidden",
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  background: "#facc15",
                  height: "100%",
                  transition: "width 0.3s ease",
                }}
              ></div>
            </div>
            <p style={{ fontSize: "0.85rem" }}>{progressPercent}% Complete</p>
          </div>

          {/* Recommended */}
          <div>
            <p style={{ fontWeight: "bold" }}>⭐ Recommended Topics</p>
            <ul style={{ listStyle: "none", paddingLeft: 0 }}>
              {recommended.length ? (
                recommended.map((r) => (
                  <li
                    key={r.id}
                    style={{
                      background: "rgba(255,255,255,0.2)",
                      padding: "6px 10px",
                      borderRadius: "8px",
                      marginBottom: "6px",
                    }}
                  >
                    {r.name}
                  </li>
                ))
              ) : (
                <li>No recommendations yet</li>
              )}
            </ul>
            <div
              style={{
                background: "rgba(255,255,255,0.2)",
                borderRadius: "10px",
                padding: "10px",
                fontStyle: "italic",
                fontSize: "0.85rem",
              }}
            >
              💬 “{quote}”
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: "#ef4444",
            border: "none",
            color: "white",
            padding: "10px 0",
            borderRadius: "10px",
            fontWeight: "bold",
            cursor: "pointer",
            marginTop: "1rem",
          }}
        >
          Logout
        </button>
      </aside>

      <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
