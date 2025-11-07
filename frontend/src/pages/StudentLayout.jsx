import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";

const API_BASE = "http://localhost:5000";

export default function StudentLayout() {
  const [student, setStudent] = useState(null);
  const [progress, setProgress] = useState({ total: 0, mastered: 0 });
  const [recommended, setRecommended] = useState([]);
  const [quote, setQuote] = useState("");

  useEffect(() => {
    async function load() {
      const id = localStorage.getItem("studentId");
      if (!id) return;

      const stuRes = await fetch(`${API_BASE}/students/${id}`);
      const stuJson = await stuRes.json();
      setStudent(stuJson);

      const pathRes = await fetch(`${API_BASE}/students/${id}/path`);
      const pathJson = await pathRes.json();

      setProgress({
        total: pathJson.mastered.length + pathJson.recommended.length,
        mastered: pathJson.mastered.length,
      });
      setRecommended(pathJson.recommended.slice(0, 3));
    }
    load();

    // rotate quotes daily
    const quotes = [
      "Mathematics is the language of the universe!",
      "Every problem has a solution — let’s find it!",
      "Mistakes mean you’re trying, and that’s what matters!",
      "Learning is your superpower! 💪",
    ];
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);

  const progressPercent = progress.total
    ? Math.round((progress.mastered / progress.total) * 100)
    : 0;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f0f9ff" }}>
      {/* 🌈 Sidebar */}
      <aside
        style={{
          width: 280,
          background: "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)",
          color: "white",
          padding: "1.5rem",
          boxShadow: "4px 0 10px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          {/* Profile */}
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <img
              src="https://cdn-icons-png.flaticon.com/512/706/706830.png"
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
                overflow: "hidden",
                height: 14,
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

          {/* Recommended Topics */}
          <div>
            <p style={{ fontWeight: "bold" }}>⭐ Recommended Topics</p>
            <ul style={{ listStyle: "none", paddingLeft: 0, fontSize: "0.9rem" }}>
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
                    {r.title || r.id}
                  </li>
                ))
              ) : (
                <li>No recommendations yet</li>
              )}
            </ul>
          </div>
        </div>

        {/* Daily Quote */}
        <div
          style={{
            background: "rgba(255,255,255,0.2)",
            borderRadius: "10px",
            padding: "10px",
            fontSize: "0.85rem",
            fontStyle: "italic",
          }}
        >
          💬 “{quote}”
        </div>
      </aside>

      {/* Main Dashboard */}
      <main style={{ flex: 1, padding: "1.5rem" }}>
        <Outlet />
      </main>
    </div>
  );
}
