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
  const [activeVideo, setActiveVideo] = useState(null);
  const [activeContentId, setActiveContentId] = useState(null);
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

  // make sure this is in the same component scope as studentId and setSeen
  async function markSeen(contentId) {
    // optimistic UI: add immediately so UI feels snappy
    setSeen((prev) => (prev.includes(contentId) ? prev : [...prev, contentId]));

    try {
      const res = await fetch(`${API_BASE}/students/${studentId}/content_seen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_id: contentId }),
      });

      const json = await res.json();

      if (!res.ok) {
        // revert optimistic change if server rejected
        setSeen((prev) => prev.filter((id) => id !== contentId));
        throw new Error(json.error || "Failed to mark content seen");
      }

      // If response contains the canonical seen list, sync with it
      if (json.content_seen) {
        setSeen(json.content_seen);
      } else if (json.data?.content_seen) {
        setSeen(json.data.content_seen);
      } // otherwise keep optimistic

      return json;
    } catch (err) {
      console.error("markSeen error:", err);
      throw err; // rethrow so caller knows it failed
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

  if (loading) return <div style={{ padding: 20 }}>Loading topic...</div>;

  return (
    <div style={{ background: "linear-gradient(to bottom,#eaf6ff,#fff6f8)", minHeight: "100vh", padding: "40px 60px", position: "relative" }}>
      <button onClick={() => navigate(-1)} style={{ display: "block", width: "100%", background: "#4db6ac", border: "none", color: "white", fontWeight: "bold", padding: "12px", borderRadius: 10, cursor: "pointer", marginBottom: 24 }}>
        ← Back to Dashboard
      </button>

      <div style={{ background: "#fff", border: "1px solid #dbeafe", borderRadius: 12, padding: 24, marginBottom: 32 }}>
        <h1 style={{ marginBottom: 8, fontSize: 26, color: "#1e3a8a" }}>📘 {topic?.name}</h1>
        <p style={{ color: "#334155" }}>{topic?.description}</p>
      </div>

      <h2 style={{ marginBottom: 16, color: "#2563eb" }}>🎨 Learning Materials</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 }}>
        {contents.map((c) => (
          <div key={c.id} style={{ background: "#fff", border: "1px solid #e0e7ff", borderRadius: 12, padding: 16, boxShadow: "0 3px 6px rgba(0,0,0,0.08)", position: "relative" }}>
            <h3 style={{ marginBottom: 8, fontWeight: "bold", color: "#2563eb", cursor: "pointer" }}
                onClick={() => { setActiveVideo(getEmbedLink(c.link)); setActiveContentId(c.id); }}>
              ▶ {c.title}
            </h3>

            <p style={{ fontSize: 14, color: "#475569", marginBottom: 12 }}>{c.description}</p>

            {seen.includes(c.id) ? (
              <span style={{ color: "#16a34a", fontWeight: "bold" }}>✅ Viewed</span>
            ) : (
              <span style={{ color: "#f59e0b", fontWeight: "bold" }}>Not viewed</span>
            )}
          </div>
        ))}
      </div>

      <button onClick={() => navigate(-1)} style={{ display: "block", width: "100%", background: "#4db6ac", border: "none", color: "white", fontWeight: "bold", padding: "12px", borderRadius: 10, cursor: "pointer", marginTop: 24 }}>
        ← Back to Dashboard
      </button>

      {/* Modal pop-out */}
      {activeVideo && (
        <div onClick={() => { setActiveVideo(null); setActiveContentId(null); }} style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", padding: 12, borderRadius: 12, maxWidth: "95%", width: "900px", boxShadow: "0 8px 24px rgba(0,0,0,0.25)", position: "relative" }}>
            <button onClick={() => { setActiveVideo(null); setActiveContentId(null); }}
              style={{ position: "absolute", top: 10, right: 12, background: "#ef4444", color: "white", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", zIndex: 1300 }}>
              ✖
            </button>

            {/* Mark as Seen & Close — visible if not already seen */}
            {activeContentId && !seen.includes(activeContentId) && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    // await the function so we only close on success
                    await markSeen(activeContentId);

                    // notify other parts of the app (optional)
                    window.dispatchEvent(new Event("contentSeenUpdated"));

                    // close modal/viewer — use whatever state names your component uses
                    // common names: setActiveVideo(null) or setActiveContent(null)
                    if (typeof setActiveVideo === "function") setActiveVideo(null);
                    if (typeof setActiveContentId === "function") setActiveContentId(null);
                    if (typeof setActiveContent === "function") setActiveContent(null);
                  } catch (err) {
                    // show failure feedback (console first; add UI feedback as needed)
                    console.error("Failed to mark seen:", err);
                    // optionally show an alert or toast:
                    // alert("Could not mark content as seen. Try again.");
                  }
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
                  zIndex: 1300,
                }}
              >
                ✅ Mark as Seen & Close
              </button>
            )}

            <iframe src={activeVideo} title="player" width="100%" height="520" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ border: "none", borderRadius: 8 }} />
          </div>
        </div>
      )}
    </div>
  );
}
