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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const [topicRes, contentRes, stuRes] = await Promise.all([
          fetch(`${API_BASE}/topics/list`),
          fetch(`${API_BASE}/content/${topicId}`),
          fetch(`${API_BASE}/students/${studentId}`),
        ]);

        const topicList = await topicRes.json();
        setTopic((topicList || []).find((t) => t.id === topicId) || null);

        const contentList = await contentRes.json();
        setContents(contentList || []);

        const stu = await stuRes.json();
        setSeen(stu.content_seen || []);
      } catch (err) {
        console.error("Error loading topic content:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [studentId, topicId]);

  // ✅ Mark as seen function
  async function markSeen(contentId) {
    try {
      const res = await fetch(`${API_BASE}/students/${studentId}/content_seen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_id: contentId }),
      });
      const data = await res.json();
      setSeen(data.content_seen || []);
      return data;
    } catch (err) {
      console.error("markSeen failed:", err);
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading topic...</div>;

  // 🧠 Handle different embed formats
  const renderEmbed = (link) => {
    if (!link) return null;

    // YouTube
    if (link.includes("youtube.com") || link.includes("youtu.be")) {
      const embed = link.includes("embed/")
        ? link
        : link.includes("watch?v=")
        ? `https://www.youtube.com/embed/${link.split("v=")[1].split("&")[0]}`
        : link;
      return (
        <iframe
          src={embed}
          title="Video Content"
          width="100%"
          height="520"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{
            border: "none",
            borderRadius: 8,
            pointerEvents: "auto",
          }}
        />
      );
    }

    // PDF
    if (link.endsWith(".pdf")) {
      return (
        <iframe
          src={link}
          width="100%"
          height="600"
          title="PDF Viewer"
          style={{
            border: "none",
            borderRadius: 8,
            pointerEvents: "auto",
          }}
        />
      );
    }

    // Canva / Genially / Interactive embeds
    if (link.includes("canva.com") || link.includes("genial.ly")) {
      return (
        <iframe
          src={link}
          width="100%"
          height="600"
          title="Interactive Content"
          allowFullScreen
          style={{
            border: "none",
            borderRadius: 8,
            pointerEvents: "auto",
          }}
        />
      );
    }

    // Fallback (generic link)
    return (
      <div
        style={{
          padding: 20,
          background: "#f9fafb",
          borderRadius: 10,
          width: "100%",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#374151" }}>
          This content type isn’t embeddable. You can open it directly:
        </p>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#2563eb",
            textDecoration: "underline",
            fontWeight: "bold",
          }}
        >
          Open Content in New Tab
        </a>
      </div>
    );
  };

  return (
    <div
      style={{
        background: "linear-gradient(to bottom,#eaf6ff,#fff6f8)",
        minHeight: "100vh",
        padding: "40px 60px",
        position: "relative",
      }}
    >
      {/* 🔙 Back Button */}
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
        }}
      >
        ← Back to Dashboard
      </button>

      {/* 🧩 Topic Header */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #dbeafe",
          borderRadius: 12,
          padding: 24,
          marginBottom: 32,
        }}
      >
        <h1 style={{ marginBottom: 8, fontSize: 26, color: "#1e3a8a" }}>
          📘 {topic?.name}
        </h1>
        <p style={{ color: "#334155" }}>{topic?.description}</p>
      </div>

      {/* 🎨 Learning Materials */}
      <h2 style={{ marginBottom: 16, color: "#2563eb" }}>🎨 Learning Materials</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
          gap: 20,
        }}
      >
        {contents.map((c) => (
          <div
            key={c.id}
            style={{
              background: "#fff",
              border: "1px solid #e0e7ff",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 3px 6px rgba(0,0,0,0.08)",
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
                Not viewed
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 🌈 Universal Modal */}
      {activeContent && (
        <div
          onClick={() => setActiveContent(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "flex-start",
            paddingTop: "5vh",
            justifyContent: "center",
            zIndex: 1200,
            overflowY: "auto",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              padding: 16,
              borderRadius: 12,
              maxWidth: "95%",
              width: "900px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              position: "relative",
            }}
          >
            {/* ✅ Mark as Seen & Close */}
            {!seen.includes(activeContent.id) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  markSeen(activeContent.id)
                    .then(async () => {
                      const stuRes = await fetch(`${API_BASE}/students/${studentId}`);
                      const stuJson = await stuRes.json();
                      setSeen(stuJson.content_seen || []);
                      setActiveContent(null);
                    })
                    .catch(() => {});
                }}
                style={{
                  position: "absolute",
                  top: 10,
                  left: 12,
                  background: "#f59e0b",
                  color: "white",
                  border: "none",
                  padding: "8px 10px",
                  borderRadius: 8,
                  cursor: "pointer",
                  zIndex: 1301,
                }}
              >
                ✅ Mark as Seen & Close
              </button>
            )}

            {/* ❌ Close Button */}
            <button
              onClick={() => setActiveContent(null)}
              style={{
                position: "absolute",
                top: 10,
                right: 12,
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: 36,
                height: 36,
                cursor: "pointer",
                zIndex: 1301,
              }}
            >
              ✖
            </button>

            <div style={{ marginTop: 50 }}>{renderEmbed(activeContent.link)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
