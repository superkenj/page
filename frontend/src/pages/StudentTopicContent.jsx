// frontend/src/pages/StudentTopicContent.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "https://page-jirk.onrender.com";

export default function StudentTopicContent() {
  const { id: studentId, topicId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [contents, setContents] = useState([]);
  const [seen, setSeen] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        // Load topic details
        const topicRes = await fetch(`${API_BASE}/topics/list`);
        const topicList = await topicRes.json();
        const found = topicList.find((t) => t.id === topicId);
        setTopic(found);

        // Load topic content
        const res = await fetch(`${API_BASE}/content/${topicId}`);
        const json = await res.json();
        setContents(json);

        // Load student's seen content
        const stuRes = await fetch(`${API_BASE}/students/${studentId}`);
        const stuJson = await stuRes.json();
        setSeen(stuJson.content_seen || []);
      } catch (err) {
        console.error("Error loading content:", err);
      }
    }
    load();
  }, [studentId, topicId]);

  async function markSeen(contentId) {
    try {
      const res = await fetch(`${API_BASE}/students/${studentId}/content_seen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_id: contentId }),
      });
      const data = await res.json();
      setSeen(data.content_seen || []);
    } catch (err) {
      console.error("Failed to mark content as seen:", err);
    }
  }

  if (!topic) return <div style={{ padding: 20 }}>Loading topic...</div>;

  return (
    <div style={{ padding: "40px 60px" }}>
      {/* Top Back Button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: "block",
          width: "100%",
          background: "#facc15",
          border: "none",
          color: "white",
          fontWeight: "bold",
          padding: "12px",
          borderRadius: 10,
          cursor: "pointer",
          marginBottom: 24,
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        ← Back to Dashboard
      </button>

      {/* Topic Header */}
      <div
        style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: 24,
          marginBottom: 32,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h1 style={{ marginBottom: 8, fontSize: 24 }}>📘 {topic.name}</h1>
        <p style={{ color: "#374151" }}>{topic.description}</p>
      </div>

      {/* Learning Materials Section */}
      <h2 style={{ marginBottom: 16 }}>📚 Learning Materials</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {contents.length === 0 && (
          <p style={{ color: "#6b7280" }}>No materials available yet.</p>
        )}

        {contents.map((c) => (
          <div
            key={c.id}
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: 16,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
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
            <h3
              style={{
                marginBottom: 8,
                fontWeight: "bold",
                cursor: "pointer",
                color: "#1d4ed8",
              }}
              onClick={() =>
                setExpanded(expanded === c.id ? null : c.id)
              }
            >
              {c.title}
            </h3>
            <p style={{ fontSize: 14, color: "#374151", marginBottom: 12 }}>
              {c.description}
            </p>

            {expanded === c.id && (
              <div
                style={{
                  background: "#f9fafb",
                  borderRadius: 8,
                  padding: 8,
                  marginBottom: 10,
                }}
              >
                <iframe
                  src={c.link}
                  title={c.title}
                  width="100%"
                  height="200"
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                  }}
                ></iframe>
              </div>
            )}

            {seen.includes(c.id) ? (
              <span style={{ color: "green", fontWeight: "bold" }}>
                ✅ Viewed
              </span>
            ) : (
              <button
                onClick={() => markSeen(c.id)}
                style={{
                  background: "#f59e0b",
                  color: "white",
                  border: "none",
                  padding: "6px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: "bold",
                }}
              >
                Mark as Seen
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Back Button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: "block",
          width: "100%",
          background: "#facc15",
          border: "none",
          color: "white",
          fontWeight: "bold",
          padding: "12px",
          borderRadius: 10,
          cursor: "pointer",
          marginTop: 40,
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        ← Back to Dashboard
      </button>
    </div>
  );
}
