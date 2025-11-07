// frontend/src/pages/StudentTopicContent.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000";

export default function StudentTopicContent() {
  const { id: studentId, topic_id } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [contents, setContents] = useState([]);
  const [seen, setSeen] = useState([]);

  // Load topic details + contents
  useEffect(() => {
    async function load() {
      // Load topic details from backend (if needed)
      const topicRes = await fetch(`${API_BASE}/topics/list`);
      const topicList = await topicRes.json();
      const found = topicList.find(t => t.id === topic_id);
      setTopic(found);

      // Load topic content
      const res = await fetch(`${API_BASE}/content/${topic_id}`);
      const json = await res.json();
      setContents(json);

      // Load seen list
      const stuRes = await fetch(`${API_BASE}/students/${studentId}`);
      const stuJson = await stuRes.json();
      setSeen(stuJson.content_seen || []);
    }
    load();
  }, [studentId, topic_id]);

  async function markSeen(contentId) {
    try {
      const res = await fetch(`${API_BASE}/students/${studentId}/content_seen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_id: contentId })
      });
      const data = await res.json();
      setSeen(data.content_seen || []);
    } catch (err) {
      console.error("Failed to mark content as seen:", err);
    }
  }

  if (!topic) return <div>Loading topic...</div>;

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => navigate(-1)}>&larr; Back</button>
      <h1>{topic.name}</h1>
      <p style={{ color: "#555" }}>{topic.description}</p>
      <hr style={{ margin: "1rem 0" }} />

      <h3>Learning Materials</h3>
      {contents.length === 0 && <p>No materials yet for this topic.</p>}
      {contents.map((c) => (
        <div key={c.id} style={{
          marginBottom: 10,
          padding: "10px",
          border: "1px solid #ddd",
          borderRadius: 6,
          background: "#fafafa"
        }}>
          <a href={c.link} target="_blank" rel="noreferrer">{c.title}</a>
          <p style={{ fontSize: 13, color: "#666" }}>{c.description}</p>
          {seen.includes(c.id) ? (
            <span style={{ color: "green", fontWeight: "bold" }}>✅ Viewed</span>
          ) : (
            <button
              onClick={() => markSeen(c.id)}
              style={{
                background: "#f59e0b",
                color: "white",
                border: "none",
                padding: "5px 8px",
                borderRadius: 4,
                cursor: "pointer"
              }}
            >
              Mark as Seen
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
