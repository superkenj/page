// frontend/src/pages/TeacherTopicContents.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "https://page-jirk.onrender.com";

export default function TeacherTopicContents() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [contents, setContents] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ link: "", type: "", description: "" });

  useEffect(() => {
    async function loadData() {
      const tRes = await fetch(`${API_BASE}/topics/list`);
      const tJson = await tRes.json();
      const found = tJson.find((t) => t.id === topicId);
      setTopic(found);

      const cRes = await fetch(`${API_BASE}/content/${topicId}`);
      const cJson = await cRes.json();
      setContents(cJson);
    }
    loadData();
  }, [topicId]);

  // 🧩 Begin editing a resource
  function startEdit(item) {
    setEditingId(item.id);
    setEditData({
      link: item.link || "",
      type: item.type || "video",
      description: item.description || "",
    });
  }

  // 🚫 Cancel editing
  function cancelEdit() {
    setEditingId(null);
    setEditData({ link: "", type: "", description: "" });
  }

  // 💾 Save changes to Firestore
  async function saveEdit(itemId) {
    try {
      await fetch(`${API_BASE}/content/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      alert("Content updated successfully!");
      setEditingId(null);

      const cRes = await fetch(`${API_BASE}/content/${topicId}`);
      const cJson = await cRes.json();
      setContents(cJson);
    } catch (err) {
      console.error(err);
      alert("Failed to update content.");
    }
  }

  // ❌ Delete content
  async function deleteContent(itemId) {
    if (!window.confirm("Are you sure you want to delete this content?")) return;
    try {
      await fetch(`${API_BASE}/content/${itemId}`, { method: "DELETE" });
      setContents(contents.filter((c) => c.id !== itemId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete content.");
    }
  }

  if (!topic) return <div>Loading...</div>;

  return (
    <div style={{ padding: 20 }}>
      <button
        onClick={() => navigate("/teacher/content")}
        style={{
          marginBottom: 20,
          background: "#e5e7eb",
          border: "none",
          padding: "6px 10px",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        ← Back
      </button>

      <h1>{topic.name}</h1>
      <p style={{ color: "#555" }}>{topic.description}</p>

      {contents.length === 0 ? (
        <p>No materials yet.</p>
      ) : (
        contents.map((m) => (
          <div
            key={m.id}
            style={{
              background: "#f9fafb",
              borderRadius: 10,
              padding: 16,
              marginBottom: 12,
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              maxWidth: 720,
            }}
          >
            {/* EDIT MODE */}
            {editingId === m.id ? (
              <div>
                <h3 style={{ marginBottom: 10 }}>Editing Resource</h3>
                <label style={{ display: "block", fontWeight: 600 }}>Type</label>
                <select
                  value={editData.type}
                  onChange={(e) => setEditData({ ...editData, type: e.target.value })}
                  style={{
                    marginBottom: 8,
                    padding: 6,
                    borderRadius: 4,
                    width: "100%",
                  }}
                >
                  <option value="video">Video</option>
                  <option value="presentation">Presentation</option>
                  <option value="pdf">PDF</option>
                  <option value="link">Link</option>
                </select>

                <label style={{ display: "block", fontWeight: 600 }}>Link</label>
                <input
                  type="text"
                  value={editData.link}
                  onChange={(e) => setEditData({ ...editData, link: e.target.value })}
                  style={{
                    width: "100%",
                    marginBottom: 8,
                    padding: 6,
                    borderRadius: 4,
                    border: "1px solid #ccc",
                  }}
                />

                <label style={{ display: "block", fontWeight: 600 }}>Description</label>
                <textarea
                  rows={2}
                  value={editData.description}
                  onChange={(e) =>
                    setEditData({ ...editData, description: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: 6,
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    marginBottom: 10,
                  }}
                />

                <button
                  onClick={() => saveEdit(m.id)}
                  style={{
                    background: "#16a34a",
                    color: "white",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: 6,
                    marginRight: 8,
                  }}
                >
                  💾 Save
                </button>
                <button
                  onClick={cancelEdit}
                  style={{
                    background: "#9ca3af",
                    color: "white",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: 6,
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <h3 style={{ marginBottom: 8 }}>{m.type.toUpperCase()}</h3>
                <p style={{ marginBottom: 8 }}>{m.description}</p>

                {/* PREVIEW AREA */}
                {m.type === "video" && (
                  <div
                    style={{
                      position: "relative",
                      paddingBottom: "56.25%", // 16:9 aspect ratio
                      height: 0,
                      overflow: "hidden",
                      borderRadius: 6,
                      marginBottom: 8,
                    }}
                  >
                    <iframe
                      src={m.link.replace("watch?v=", "embed/")}
                      title="Video"
                      frameBorder="0"
                      allowFullScreen
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        borderRadius: 6,
                      }}
                    />
                  </div>
                )}

                {m.type === "presentation" && (
                  <iframe
                    src={m.link}
                    width="100%"
                    height="400"
                    style={{
                      border: "none",
                      borderRadius: 6,
                      marginBottom: 8,
                      maxWidth: 720,
                    }}
                  />
                )}
                {m.type === "pdf" && (
                  <iframe
                    src={m.link}
                    width="100%"
                    height="500"
                    style={{
                      border: "none",
                      borderRadius: 6,
                      marginBottom: 8,
                      maxWidth: 720,
                    }}
                  />
                )}
                {m.type === "link" && (
                  <a href={m.link} target="_blank" rel="noreferrer">
                    Open Resource ↗
                  </a>
                )}

                <div style={{ marginTop: 10 }}>
                  <button
                    onClick={() => startEdit(m)}
                    style={{
                      background: "#3b82f6",
                      color: "white",
                      border: "none",
                      padding: "6px 10px",
                      borderRadius: 6,
                      marginRight: 8,
                    }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => deleteContent(m.id)}
                    style={{
                      background: "#dc2626",
                      color: "white",
                      border: "none",
                      padding: "6px 10px",
                      borderRadius: 6,
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}
