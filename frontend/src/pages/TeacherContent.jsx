import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000";

export default function TeacherContent() {
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [links, setLinks] = useState([{ link: "", type: "video", description: "" }]);
  const [contents, setContents] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ link: "", type: "", description: "" });
  const navigate = useNavigate();

  // Load topics
  useEffect(() => {
    async function loadTopics() {
      const res = await fetch(`${API_BASE}/topics/list`);
      const json = await res.json();
      setTopics(json);
    }
    loadTopics();
  }, []);

  // Load contents
  useEffect(() => {
    async function loadContents() {
      const res = await fetch(`${API_BASE}/content`);
      const json = await res.json();
      setContents(json);
    }
    loadContents();
  }, []);

  function addLinkField() {
    setLinks([...links, { link: "", type: "video", description: "" }]);
  }

  function removeLinkField(index) {
    setLinks(links.filter((_, i) => i !== index));
  }

  function updateLink(index, value) {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
  }

  // Add new content
  async function handleAddContent() {
    if (!selectedTopic) {
      alert("Please select a topic first.");
      return;
    }

    const validLinks = links.filter((i) => i.link.trim() !== "");
    if (validLinks.length === 0) {
      alert("Add at least one valid resource link.");
      return;
    }

    for (const item of validLinks) {
      await fetch(`${API_BASE}/content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: selectedTopic,
          title: topics.find((t) => t.id === selectedTopic)?.name || "Untitled",
          description: item.description || "",
          link: item.link,
          type: item.type,
          created_by: "teacher",
        }),
      });
    }

    alert("Content added successfully!");
    setLinks([{ link: "", type: "video", description: "" }]);
    const res = await fetch(`${API_BASE}/content`);
    setContents(await res.json());
  }

  // Delete individual content
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

  // Delete entire topic and its contents
  async function deleteTopic(topicId) {
    if (
      !window.confirm(
        "Deleting this topic will also remove all its related contents. Continue?"
      )
    )
      return;

    try {
      const topicContents = contents.filter((c) => c.topic_id === topicId);
      for (const c of topicContents) {
        await fetch(`${API_BASE}/content/${c.id}`, { method: "DELETE" });
      }

      await fetch(`${API_BASE}/topics/${topicId}`, { method: "DELETE" });

      setTopics(topics.filter((t) => t.id !== topicId));
      setContents(contents.filter((c) => c.topic_id !== topicId));
      alert("Topic and all associated contents deleted successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to delete topic.");
    }
  }

  // Editing logic
  function startEdit(item) {
    setEditingId(item.id);
    setEditData({
      link: item.link || "",
      type: item.type || "video",
      description: item.description || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditData({ link: "", type: "", description: "" });
  }

  async function saveEdit(itemId) {
    try {
      await fetch(`${API_BASE}/content/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      alert("Content updated successfully!");
      setEditingId(null);

      const res = await fetch(`${API_BASE}/content`);
      const json = await res.json();
      setContents(json);
    } catch (err) {
      console.error(err);
      alert("Failed to update content.");
    }
  }

  // Group contents by topic
  const groupedContents = topics
    .map((topic) => ({
      ...topic,
      materials: contents.filter((c) => c.topic_id === topic.id),
    }))
    .filter((t) => t.materials.length > 0);

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ marginBottom: 20 }}>📚 Manage Learning Materials</h1>

      {/* Add new content */}
      <div
        style={{
          background: "#f9fafb",
          padding: 20,
          borderRadius: 12,
          marginBottom: 40,
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        }}
      >
        <h3 style={{ marginBottom: 16 }}>Add New Content</h3>

        <label style={{ fontWeight: 600 }}>Topic</label>
        <select
          value={selectedTopic}
          onChange={(e) => setSelectedTopic(e.target.value)}
          style={{ display: "block", marginBottom: 16, padding: 8, width: "100%" }}
        >
          <option value="">-- Select Topic --</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        {links.map((item, i) => (
          <div
            key={i}
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 10,
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <input
                type="text"
                placeholder={`Resource link #${i + 1}`}
                value={item.link}
                onChange={(e) => updateLink(i, { ...item, link: e.target.value })}
                style={{ flex: 1, padding: 8 }}
              />
              <select
                value={item.type}
                onChange={(e) => updateLink(i, { ...item, type: e.target.value })}
                style={{ padding: 8 }}
              >
                <option value="video">Video</option>
                <option value="presentation">Presentation</option>
                <option value="pdf">PDF</option>
                <option value="link">Link</option>
              </select>
              {links.length > 1 && (
                <button
                  onClick={() => removeLinkField(i)}
                  style={{
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    padding: "6px 8px",
                  }}
                >
                  ✖
                </button>
              )}
            </div>
            <textarea
              rows={2}
              placeholder="Short description for this resource..."
              value={item.description}
              onChange={(e) =>
                updateLink(i, { ...item, description: e.target.value })
              }
              style={{ width: "100%", padding: 8, resize: "vertical" }}
            />
          </div>
        ))}

        <button
          onClick={addLinkField}
          style={{
            background: "#3b82f6",
            color: "white",
            border: "none",
            padding: "6px 12px",
            borderRadius: 6,
            marginBottom: 12,
          }}
        >
          ➕ Add Another Resource
        </button>

        <button
          onClick={handleAddContent}
          style={{
            background: "#16a34a",
            color: "white",
            border: "none",
            padding: "10px 14px",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Save Content
        </button>
      </div>

      {/* All grouped contents */}
      <h3 style={{ marginBottom: 20 }}>📁 All Contents by Topic</h3>
      {groupedContents.length === 0 ? (
        <p>No contents added yet.</p>
      ) : (
        groupedContents.map((topic) => (
          <div
            key={topic.id}
            className="topic-card"
            onClick={(e) => {
              // Prevent navigation if clicking delete button
              if (e.target.tagName !== "BUTTON") navigate(`/teacher/content/${topic.id}`);
            }}
            style={{
              background: "#fff",
              marginBottom: 20,
              padding: 20,
              borderRadius: 10,
              boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              position: "relative",
              cursor: "pointer",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.01)";
              e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.05)";
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteTopic(topic.id);
              }}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                background: "#dc2626",
                color: "white",
                border: "none",
                padding: "6px 10px",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              🗑️ Delete Topic
            </button>

            <h2 style={{ marginBottom: 10, color: "#1e40af" }}>{topic.name}</h2>
            <p style={{ color: "#555", marginBottom: 15 }}>{topic.description}</p>

            <ul style={{ listStyle: "none", paddingLeft: 0 }}>
              {topic.materials.map((m) => (
                <li
                  key={m.id}
                  style={{
                    background: "#f3f4f6",
                    padding: 10,
                    marginBottom: 8,
                    borderRadius: 6,
                    maxWidth: 720,
                  }}
                >
                  {editingId === m.id ? (
                    <>
                      <h4>Editing Resource</h4>
                      <input
                        type="text"
                        value={editData.link}
                        placeholder="Link"
                        onChange={(e) =>
                          setEditData({ ...editData, link: e.target.value })
                        }
                        style={{
                          width: "100%",
                          marginBottom: 8,
                          padding: 6,
                          borderRadius: 4,
                          border: "1px solid #ccc",
                        }}
                      />
                      <select
                        value={editData.type}
                        onChange={(e) =>
                          setEditData({ ...editData, type: e.target.value })
                        }
                        style={{
                          width: "100%",
                          marginBottom: 8,
                          padding: 6,
                          borderRadius: 4,
                        }}
                      >
                        <option value="video">Video</option>
                        <option value="presentation">Presentation</option>
                        <option value="pdf">PDF</option>
                        <option value="link">Link</option>
                      </select>
                      <textarea
                        rows={2}
                        value={editData.description}
                        placeholder="Description"
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            description: e.target.value,
                          })
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
                        onClick={(e) => {
                          e.stopPropagation();
                          saveEdit(m.id);
                        }}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelEdit();
                        }}
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
                    </>
                  ) : (
                    <>
                      <strong>{m.type.toUpperCase()}</strong>
                      <p style={{ margin: "4px 0", fontSize: 14 }}>{m.link}</p>
                      <p style={{ margin: "4px 0", color: "#555" }}>{m.description}</p>
                      <div style={{ marginTop: 8 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(m);
                          }}
                          style={{
                            background: "#3b82f6",
                            color: "white",
                            border: "none",
                            padding: "4px 10px",
                            borderRadius: 6,
                            marginRight: 6,
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteContent(m.id);
                          }}
                          style={{
                            background: "#dc2626",
                            color: "white",
                            border: "none",
                            padding: "4px 10px",
                            borderRadius: 6,
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
