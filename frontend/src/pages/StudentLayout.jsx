// frontend/src/pages/StudentLayout.jsx
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

const API_BASE = "https://page-jirk.onrender.com";

export default function StudentLayout() {
  const params = useParams();
  const routeId = params.id;
  const [student, setStudent] = useState(null);
  const [topics, setTopics] = useState([]);
  const [mastered, setMastered] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const navigate = useNavigate();

  const studentId = routeId || localStorage.getItem("studentId");

  useEffect(() => {
    async function loadData() {
      if (!studentId) return;
      try {
        const stuRes = await fetch(`${API_BASE}/students/${studentId}`);
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

        // compute recommended (same logic as before)
        const computed = computeRecommended(allTopics, masteredTopics);
        setRecommended(computed);
      } catch (err) {
        console.error("Error loading student layout:", err);
      }
    }
    loadData();
  }, [studentId]);

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
    topics.length > 0 ? Math.round((mastered.length / topics.length) * 100) : 0;

  // childlike avatars (replace with your own images if you prefer)
  const avatarUrl =
    student?.gender === "male"
      ? "https://cdn-icons-png.flaticon.com/512/4740/4740595.png" // childlike male
      : student?.gender === "female"
      ? "https://cdn-icons-png.flaticon.com/512/4740/4740584.png" // childlike female
      : "https://cdn-icons-png.flaticon.com/512/1995/1995574.png"; // neutral kid

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
          position: "sticky",
          top: 0,
          boxShadow: "4px 0 10px rgba(0,0,0,0.05)",
          overflowY: "auto", // safe if sidebar grows
        }}
      >
        <div>
          <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
            <img
              src={avatarUrl}
              alt="avatar"
              style={{
                width: 90,
                height: 90,
                borderRadius: "50%",
                marginBottom: "10px",
                border: "3px solid white",
                backgroundColor: "white",
              }}
            />
            <h2 style={{ margin: 0, fontSize: "1.2rem" }}>
              {student ? `Hi, ${student.name}!` : "Hello!"}
            </h2>
            <p style={{ fontSize: "0.9rem", opacity: 0.95 }}>Keep up the great work! 🌟</p>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <p style={{ fontWeight: "bold" }}>Your Progress</p>
            <div
              style={{
                background: "rgba(255,255,255,0.25)",
                borderRadius: "10px",
                overflow: "hidden",
                height: 14,
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  background: "#facc15",
                  height: "100%",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <p style={{ fontSize: "0.85rem" }}>{progressPercent}% Complete</p>
          </div>

          <div>
            <p style={{ fontWeight: "bold" }}>⭐ Recommended Topics</p>
            <ul style={{ listStyle: "none", paddingLeft: 0 }}>
              {recommended.length ? (
                recommended.map((r) => (
                  <li
                    key={r.id}
                    style={{
                      background: "rgba(255,255,255,0.15)",
                      padding: "6px 10px",
                      borderRadius: "8px",
                      marginBottom: "6px",
                      fontSize: "0.95rem",
                    }}
                  >
                    {r.name}
                  </li>
                ))
              ) : (
                <li style={{ color: "rgba(255,255,255,0.9)" }}>No recommendations yet</li>
              )}
            </ul>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: "#ef4444",
            border: "none",
            color: "white",
            padding: "12px 0",
            borderRadius: "10px",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          Logout
        </button>
      </aside>

      <main style={{ flex: 1, padding: "1.5rem 2rem", overflowY: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
