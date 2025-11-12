// frontend/src/pages/StudentDashboard.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "https://page-jirk.onrender.com";

export default function StudentDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [topics, setTopics] = useState([]);
  const [path, setPath] = useState({ mastered: [], recommended: [], inProgress: [], upcoming: [] });
  const [seenIds, setSeenIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState("");

  useEffect(() => {
    async function loadAll() {
      try {
        setLoading(true);
        const [topicsRes, pathRes, stuRes] = await Promise.all([
          fetch(`${API_BASE}/topics/list`),
          fetch(`${API_BASE}/students/${id}/path`),
          fetch(`${API_BASE}/students/${id}`),
        ]);

        const topicsJson = await topicsRes.json();
        const pathJson = await pathRes.json();
        const stuJson = await stuRes.json();

        const allTopics = Array.isArray(topicsJson) ? topicsJson : topicsJson.topics || [];
        setTopics(allTopics);

        setPath({
          mastered: Array.isArray(pathJson.mastered) ? pathJson.mastered : [],
          recommended: Array.isArray(pathJson.recommended) ? pathJson.recommended : [],
          inProgress: Array.isArray(pathJson.inProgress) ? pathJson.inProgress : [],
          upcoming: Array.isArray(pathJson.upcoming) ? pathJson.upcoming : [],
        });

        // student seen content ids
        const seen = new Set(stuJson.content_seen || []);
        setSeenIds(seen);

        // Derive inProgress client-side: if any content of a topic is seen and topic not mastered
        // fetch content lists for topics that are not mastered
        const notMasteredTopics = allTopics.filter((t) => !pathJson.mastered?.some((m) => m.id === t.id));
        const fetches = notMasteredTopics.map((t) =>
          fetch(`${API_BASE}/content/${t.id}`).then((r) => r.json()).then((list) => ({ topicId: t.id, list }))
        );
        const results = await Promise.all(fetches);

        // decide which topics have seen items
        const clientInProgress = [];
        for (const res of results) {
          const hasSeen = res.list.some((c) => seen.has(c.id));
          if (hasSeen) clientInProgress.push(res.topicId);
        }

        setPath((prev) => ({
          ...prev,
          inProgress: Array.from(new Set([...(prev.inProgress || []).map((p) => (typeof p === "object" ? p.id : p)), ...clientInProgress])).map((id) => ({ id })), // normalize to objects with id
        }));

        // set a nice random quote
        const quotes = [
          "Mathematics is the language of the universe!",
          "Every problem has a solution — let’s find it!",
          "Mistakes mean you're trying, and that's what matters!",
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

    // listen for mark-as-seen events from topic page and refresh
    window.addEventListener("contentSeenUpdated", loadAll);
    return () => window.removeEventListener("contentSeenUpdated", loadAll);
  }, [id]);

  function getStatus(topicId) {
    if (path.mastered.some((t) => (typeof t === "object" ? t.id : t) === topicId)) return "Mastered";
    if (path.inProgress.some((t) => (typeof t === "object" ? t.id : t) === topicId)) return "In Progress";
    if (path.recommended.some((t) => (typeof t === "object" ? t.id : t) === topicId)) return "Recommended";
    return "Upcoming";
  }

  function getColorForStatus(status) {
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

  if (loading) return <div style={{ padding: 20 }}>Loading dashboard...</div>;

  // sort by the required order
  const order = { "In Progress": 1, Recommended: 2, Mastered: 3, Upcoming: 4 };
  const sorted = [...topics].sort((a, b) => order[getStatus(a.id)] - order[getStatus(b.id)]);

  return (
    <div style={{ padding: "20px 40px" }}>
      <h2 style={{
        textAlign: "center",
        marginBottom: 32,
        background: "linear-gradient(90deg,#3b82f6,#06b6d4)",
        color: "white",
        padding: "10px 20px",
        borderRadius: 10,
        boxShadow: "0 3px 6px rgba(0,0,0,0.15)",
      }}>
        💬 “{quote}”
      </h2>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 16,
      }}>
        {sorted.map((t) => {
          const status = getStatus(t.id);
          const color = getColorForStatus(status);
          return (
            <div
              key={t.id}
              onClick={() => navigate(`/student-dashboard/${id}/topic/${t.id}`)}
              style={{
                background: status === "Mastered" ? "#dcfce7" : status === "In Progress" ? "#dbeafe" : status === "Recommended" ? "#fef9c3" : "#f3f4f6",
                border: `2px solid ${color}`,
                borderRadius: 10,
                padding: 16,
                cursor: "pointer",
                position: "relative",
                transition: "transform 0.15s",
              }}
            >
              <div style={{
                position: "absolute",
                top: 10, right: 10,
                background: color, color: "white",
                fontSize: 12, fontWeight: "bold", padding: "3px 8px", borderRadius: "12px"
              }}>{status}</div>

              <h3 style={{ marginBottom: 8 }}>{t.name}</h3>
              <p style={{ fontSize: 14, color: "#374151" }}>{t.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
