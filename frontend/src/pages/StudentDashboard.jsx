// frontend/src/pages/StudentDashboard.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "https://page-jirk.onrender.com";

export default function StudentDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [topics, setTopics] = useState([]);
  const [path, setPath] = useState({ mastered: [], recommended: [], inProgress: [], upcoming: [] });
  const [loading, setLoading] = useState(true);

  // fetch topics + path + student (for content_seen)
  async function loadAll() {
    try {
      setLoading(true);
      const [tRes, pRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/topics/list`),
        fetch(`${API_BASE}/students/${id}/path`),
        fetch(`${API_BASE}/students/${id}`),
      ]);
      const tJson = await tRes.json();
      const pJson = await pRes.json();
      const sJson = await sRes.json();

      const allTopics = Array.isArray(tJson) ? tJson : tJson.topics || [];
      setTopics(allTopics);

      const p = {
        mastered: Array.isArray(pJson.mastered) ? pJson.mastered : [],
        recommended: Array.isArray(pJson.recommended) ? pJson.recommended : [],
        inProgress: Array.isArray(pJson.inProgress) ? pJson.inProgress : [],
        upcoming: Array.isArray(pJson.upcoming) ? pJson.upcoming : [],
      };

      // fallback: if student.content_seen contains items from a topic and topic not mastered -> mark inProgress client-side
      const seenSet = new Set(sJson.content_seen || []);

      // For performance: only fetch content lists for topics not mastered
      const notMastered = allTopics.filter((t) => !p.mastered.some((m) => (m?.id || m) === t.id));
      const fetches = notMastered.map((t) =>
        fetch(`${API_BASE}/content/${t.id}`).then((r) => r.json()).then((list) => ({ topicId: t.id, list }))
      );
      const results = await Promise.all(fetches);

      const derivedInProgressIds = new Set(p.inProgress.map((x) => (x?.id || x)));
      for (const res of results) {
        if (res.list.some((c) => seenSet.has(c.id))) derivedInProgressIds.add(res.topicId);
      }

      p.inProgress = Array.from(derivedInProgressIds).map((id) => ({ id }));
      setPath(p);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    window.addEventListener("contentSeenUpdated", loadAll);
    return () => window.removeEventListener("contentSeenUpdated", loadAll);
  }, [id]);

  function getStatus(topicId) {
    if (path.inProgress.some((t) => (t?.id || t) === topicId)) return "In Progress";
    if (path.recommended.some((t) => (t?.id || t) === topicId)) return "Recommended";
    if (path.mastered.some((t) => (t?.id || t) === topicId)) return "Mastered";
    return "Upcoming";
  }

  function getColorForStatus(status) {
    switch (status) {
      case "In Progress": return "#3b82f6";
      case "Recommended": return "#facc15";
      case "Mastered": return "#16a34a";
      default: return "#9ca3af";
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading dashboard...</div>;

  const order = { "In Progress": 1, Recommended: 2, Mastered: 3, Upcoming: 4 };
  const sorted = [...topics].sort((a, b) => order[getStatus(a.id)] - order[getStatus(b.id)]);

  return (
    <div style={{ padding: "20px 40px" }}>
      <h2 style={{
        textAlign: "center", marginBottom: 24,
        background: "linear-gradient(90deg,#3b82f6,#06b6d4)", color: "white",
        padding: "10px 20px", borderRadius: 10, boxShadow: "0 3px 6px rgba(0,0,0,0.15)"
      }}>
        💬 Choose a recommended card to start your learning adventure!
      </h2>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
        gap: 16
      }}>
        {sorted.map((t) => {
          const status = getStatus(t.id);
          const color = getColorForStatus(status);
          return (
            <div key={t.id}
              onClick={() => navigate(`/student-dashboard/${id}/topic/${t.id}`)}
              style={{
                background: status === "Mastered" ? "#ecfdf5" : status === "In Progress" ? "#eff6ff" : status === "Recommended" ? "#fffbeb" : "#f3f4f6",
                border: `2px solid ${color}`, borderRadius: 10, padding: 16,
                cursor: "pointer", position: "relative", transition: "transform 0.15s"
              }}>
              <div style={{ position: "absolute", top: 10, right: 10, background: color, color: "white", fontSize: 12, fontWeight: "bold", padding: "3px 8px", borderRadius: 12 }}>
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
