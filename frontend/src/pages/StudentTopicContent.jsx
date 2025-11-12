import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "https://page-jirk.onrender.com";

export default function StudentTopicContent() {
  const { id: studentId, topicId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [contents, setContents] = useState([]);
  const [seen, setSeen] = useState([]);
  const [activeContent, setActiveContent] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const topicRes = await fetch(`${API_BASE}/topics/list`);
        const topicList = await topicRes.json();
        setTopic(topicList.find((t) => t.id === topicId));

        const res = await fetch(`${API_BASE}/content/${topicId}`);
        const json = await res.json();
        setContents(json);

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

      const stuRes = await fetch(`${API_BASE}/students/${studentId}`);
      const stuJson = await stuRes.json();
      setSeen(stuJson.content_seen || []);
      setActiveContent(null);
    } catch (err) {
      console.error("Failed to mark content as seen:", err);
    }
  }

  function getEmbedLink(link) {
    if (!link) return "";
    if (link.includes("youtube.com/watch?v=")) {
      const id = link.split("v=")[1].split("&")[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    return link;
  }

  if (!topic) return <div style={{ padding: 20 }}>Loading topic...</div>;

  return (
    <div
      style={{
        background: "linear-gradient(to bottom, #eaf6ff, #fff6f8)",
        minHeight: "100vh",
        padding: "40px 60px",
        position: "relative",
      }}
    >
      {/* Top Back Button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: "block",
          width: "100%",
          background: "#4db6ac",
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
          background: "#ffffff",
          border: "1px solid #dbeafe",
          borderRadius: 12,
          padding: 24,
          marginBottom: 32,
          boxShadow: "0 3px 6px rgba(0,0,0,0.05)",
        }}
      >
        <h1 style={{ marginBottom: 8, fontSize: 26, color: "#1e3a8a" }}>
          📘 {topic.name}
        </h1>
        <p style={{ color: "#334155" }}>{topic.description}</p>
      </div>

      {/* Learning Materials Section */}
      <h2 style={{ marginBottom: 16, color: "#2563eb" }}>
        🎨 Learning Materials
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 20,
        }}
      >
        {contents.map((c) => (
          <div
            key={c.id}
            style={{
              background: "#ffffff",
              border: "1px solid #e0e7ff",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 3px 6px rgba(0,0,0,0.08)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.03)";
              e.currentTarget.style.boxShadow = "0 5px 10px rgba(0,0,0,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 3px 6px rgba(0,0,0,0.08)";
            }}
          >
            <h3
              style={{
                marginBottom: 8,
                fontWeight: "bold",
                color: "#2563eb",
                cursor: "pointer",
              }}
              onClick={() => setActiveContent(c)}
            >
              ▶ {c.title}
            </h3>
            <p style={{ fontSize: 14, color: "#475569", marginBottom: 12 }}>
              {c.description}
            </p>

            {seen.includes(c.id) ? (
              <span style={{ color: "#16a34a", fontWeight: "bold" }}>
                ✅ Viewed
              </span>
            ) : (
              <span style={{ color: "#f59e0b", fontWeight: "bold" }}>
                🔸 Not viewed
              </span>
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
          background: "#4db6ac",
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

      {/* ✅ Pop-out Modal Fix */}
      {activeContent && (
        <div
          onClick={() => setActiveContent(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 20,
              width: "80%",
              maxWidth: 850,
              boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
              textAlign: "center",
            }}
          >
            <h2 style={{ marginBottom: 10 }}>{activeContent.title}</h2>
            <p style={{ marginBottom: 15 }}>{activeContent.description}</p>

            {/* ✅ Buttons are ABOVE the iframe and always clickable */}
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 12 }}>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`${API_BASE}/students/${studentId}/content_seen`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ content_id: activeContent.id }),
                    });
                    if (res.ok) {
                      setActiveContent(null); // close modal
                      window.dispatchEvent(new Event("contentSeenUpdated")); // optional
                    } else {
                      console.error("Failed to mark as seen");
                    }
                  } catch (err) {
                    console.error("Mark as seen error:", err);
                  }
                }}
                style={{
                  background: "#16a34a",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                ✅ Mark as Seen & Close
              </button>

              <button
                onClick={() => setActiveContent(null)}
                style={{
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                ✖ Close
              </button>
            </div>

            <iframe
              src={getEmbedLink(activeContent.link)}
              title="Learning Content"
              width="100%"
              height="480"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                border: "none",
                borderRadius: 10,
                display: "block",
                margin: "0 auto",
                pointerEvents: "auto", // keeps iframe active but doesn’t block buttons
              }}
            ></iframe>
          </div>
        </div>
      )}
    </div>
  );
}
