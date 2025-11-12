import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const API_BASE = "https://page-jirk.onrender.com";

export default function StudentLayout() {
  const [student, setStudent] = useState(null);
  const [topics, setTopics] = useState([]);
  const [mastered, setMastered] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      const id = localStorage.getItem("studentId");
      if (!id) return;

      try {
        // Fetch student
        const stuRes = await fetch(`${API_BASE}/students/${id}`);
        const stuJson = await stuRes.json();
        setStudent(stuJson);

        const masteredTopics = stuJson.mastered || [];
        setMastered(masteredTopics);

        // Fetch topics
        const topicRes = await fetch(`${API_BASE}/topics/list`);
        const topicJson = await topicRes.json();
        const allTopics = Array.isArray(topicJson)
          ? topicJson
          : topicJson.topics || [];
        setTopics(allTopics);

        // Compute recommendations
        const computed = computeRecommended(allTopics, masteredTopics);
        setRecommended(computed);
      } catch (err) {
        console.error("Error loading student layout:", err);
      }
    }

    loadData();
  }, []);

  function computeRecommended(allTopics, masteredList) {
    const masteredSet = new Set(masteredList.map((m) => m.id));
    let rec = allTopics.filter(
      (topic) =>
        !masteredSet.has(topic.id) &&
        topic.prerequisites &&
        topic.prerequisites.every((p) => masteredSet.has(p))
    );

    // ✅ Fallback: show topics without prerequisites if none are recommended
    if (rec.length === 0) {
      rec = allTopics.filter(
        (topic) =>
          !masteredSet.has(topic.id) &&
          (!topic.prerequisites || topic.prerequisites.length === 0)
      );
    }
    return rec;
  }

  const progressPercent =
    topics.length > 0 ? Math.round((mastered.length / topics.length) * 100) : 0;

  function handleLogout() {
    localStorage.removeItem("studentId");
    localStorage.removeItem("role");
    navigate("/");
  }

  const gender = (student?.gender || student?.sex || "").toString().trim().toLowerCase();
  const avatarUrl =
    ["male", "m", "boy", "1", "true"].includes(gender)
      ? "https://cdn-icons-png.flaticon.com/512/706/706797.png"
      : ["female", "f", "girl", "0", "false"].includes(gender)
      ? "https://cdn-icons-png.flaticon.com/512/706/706830.png"
      : "https://cdn-icons-png.flaticon.com/512/1995/1995574.png";

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f0f9ff",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 280,
          background: "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)",
          color: "white",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "4px 0 10px rgba(0,0,0,0.1)",
          borderRadius: "0 20px 20px 0",
          position: "sticky",
          top: 0,
          height: "92vh",
          overflowY: "auto",
        }}
      >
        <div>
          {/* Profile */}
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <img
              src={avatarUrl}
              alt="avatar"
              style={{
                width: 90,
                height: 90,
                borderRadius: "50%",
                marginBottom: "10px",
                border: "3px solid white",
              }}
            />
            <h2 style={{ margin: 0, fontSize: "1.2rem" }}>
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
            <ul
              style={{
                listStyle: "none",
                paddingLeft: 0,
                fontSize: "0.9rem",
                marginBottom: "1rem",
              }}
            >
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
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            background: "#ef4444",
            border: "none",
            color: "white",
            padding: "10px 0",
            borderRadius: "10px",
            fontWeight: "bold",
            marginTop: "1rem",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: "1.5rem" }}>
        <Outlet />
      </main>
    </div>
  );
}
