// frontend/src/pages/StudentLayout.jsx
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import boyImg from "../assets/images/boy.png";
import girlImg from "../assets/images/girl.png";

const API_BASE = "https://page-jirk.onrender.com";

export default function StudentLayout() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [topics, setTopics] = useState([]);
  const [mastered, setMastered] = useState([]);
  const [recommended, setRecommended] = useState([]);

  // prefer route param if present, else fallback to localStorage
  const studentId = routeId || localStorage.getItem("studentId");

  useEffect(() => {
    async function loadData() {
      if (!studentId) return;
      try {
        const [stuRes, topicRes] = await Promise.all([
          fetch(`${API_BASE}/students/${studentId}`),
          fetch(`${API_BASE}/topics/list`),
        ]);
        const stuJson = await stuRes.json();
        const topicsJson = await topicRes.json();

        setStudent(stuJson || null);
        setMastered(stuJson?.mastered || []);
        const allTopics = Array.isArray(topicsJson) ? topicsJson : topicsJson.topics || [];
        setTopics(allTopics);

        // compute recommended (same simple logic)
        const masteredSet = new Set(stuJson?.mastered || []);
        const computed = allTopics
          .filter(
            (topic) =>
              !masteredSet.has(topic.id) &&
              (topic.prerequisites || []).every((p) => masteredSet.has(p))
          )
          .map((t) => ({ id: t.id, name: t.name }));
        setRecommended(computed);
      } catch (err) {
        console.error("StudentLayout load error:", err);
      }
    }
    loadData();
  }, [studentId]);

  const progressPercent =
    topics.length > 0 ? Math.round((mastered.length / topics.length) * 100) : 0;
  
  const avatarUrl = student?.gender === "male"  ? boyImg : girlImg;

  function handleLogout() {
    localStorage.removeItem("studentId");
    localStorage.removeItem("role");
    navigate("/");
  }

  return (
    <div style={{ display: "flex", background: "#f0f9ff", minHeight: "100vh" }}>
      {/* Sidebar: sticky and visually centered; logout pinned bottom */}
      <aside
        style={{
          width: 280,
          background: "linear-gradient(180deg,#3b82f6 0%,#2563eb 100%)",
          color: "white",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignSelf: "flex-start",     // required so sticky behaves inside flex container
          position: "sticky",
          top: 0,
          minHeight: "92vh",    // ✅ responsive height
          maxHeight: "100vh",
          overflowY: "auto",    // ✅ ensures Logout is visible
          boxShadow: "4px 0 10px rgba(0,0,0,0.05)",
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
                marginBottom: 10,
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
            <div style={{ background: "rgba(255,255,255,0.25)", borderRadius: 10, overflow: "hidden", height: 14, marginBottom: 6 }}>
              <div style={{ width: `${progressPercent}%`, background: "#facc15", height: "100%", transition: "width 0.3s ease" }} />
            </div>
            <p style={{ fontSize: "0.85rem" }}>{progressPercent}% Complete</p>
          </div>

          <div>
            <p style={{ fontWeight: "bold" }}>⭐ Recommended Topics</p>
            <ul style={{ listStyle: "none", paddingLeft: 0 }}>
              {recommended.length ? (
                recommended.map((r) => (
                  <li key={r.id} style={{ background: "rgba(255,255,255,0.15)", padding: "6px 10px", borderRadius: 8, marginBottom: 6 }}>
                    {r.name}
                  </li>
                ))
              ) : (
                <li style={{ color: "rgba(255,255,255,0.9)" }}>No recommendations yet</li>
              )}
            </ul>
          </div>
        </div>

        <div>
          <button
            onClick={handleLogout}
            style={{
              background: "#ef4444",
              border: "none",
              color: "white",
              padding: "12px 0",
              borderRadius: 10,
              fontWeight: "bold",
              cursor: "pointer",
              width: "100%",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: "1.5rem 2rem", overflowY: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
