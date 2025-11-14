// frontend/src/teacher/Topics.jsx

import { useEffect, useState } from "react";
const API_BASE = "https://page-jirk.onrender.com";

export default function Topics() {
  const [topics, setTopics] = useState([]);
  const [form, setForm] = useState({
    id: "",
    name: "",
    description: "",
    prerequisites: []
  });

  const [modalOpen, setModalOpen] = useState(false);

  function setField(k, v) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  /* -------------------------------
      LOAD TOPICS
  ------------------------------- */
  async function load() {
    const res = await fetch(`${API_BASE}/topics/list`);
    const data = await res.json();
    setTopics(data);
  }

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "teacher") navigate("/");
  }, []);

  useEffect(() => {
    load();
  }, []);

  /* -------------------------------
      SAVE TOPIC
  ------------------------------- */
  async function save(e) {
    e.preventDefault();
    if (!form.id || !form.name) {
      alert("Topic ID & Name are required.");
      return;
    }

    const payload = {
      name: form.name,
      description: form.description,
      prerequisites: form.prerequisites
    };

    await fetch(`${API_BASE}/topics/${form.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    await load();
    setModalOpen(false);
    setForm({ id: "", name: "", description: "", prerequisites: [] });
  }

  /* -------------------------------
      EDIT TOPIC (opens modal)
  ------------------------------- */
  function editTopic(t) {
    setForm({
      id: t.id,
      name: t.name || "",
      description: t.description || "",
      prerequisites: t.prerequisites || []
    });
    setModalOpen(true);
  }

  /* -------------------------------
      DELETE TOPIC
  ------------------------------- */
  async function delTopic(id) {
    if (!confirm("Delete " + id + "?")) return;
    await fetch(`${API_BASE}/topics/${id}`, { method: "DELETE" });
    await load();
  }

  /* -------------------------------
      INPUT STYLE
  ------------------------------- */
  const inputStyle = {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    marginTop: 6
  };

  /* =============================
        MODAL COMPONENT
  ============================= */
  const TopicModal = () =>
    !modalOpen ? null : (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000
        }}
      >
        <div
          style={{
            background: "white",
            padding: 24,
            borderRadius: 12,
            width: "480px",
            maxHeight: "85vh",
            overflowY: "auto",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)"
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            {form.id ? "Edit Topic" : "Add Topic"}
          </h2>

          <form onSubmit={save}>
            {/* NAME */}
            <label style={{ fontWeight: "bold" }}>Topic Name</label>
            <input
              style={inputStyle}
              placeholder="Enter topic name"
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setField("name", name);

                // auto generate ID when adding a new topic only
                if (!form.id) {
                  const suggested = name
                    .toLowerCase()
                    .replace(/[^a-z ]/g, "")
                    .trim()
                    .replace(/\s+/g, "_")
                    .slice(0, 20);

                  setField("id", suggested);
                }
              }}
            />

            {/* ID */}
            <label style={{ fontWeight: "bold", marginTop: 12 }}>
              Topic ID
            </label>
            <input
              style={{ ...inputStyle, background: "#f7f7f7" }}
              value={form.id}
              onChange={(e) => setField("id", e.target.value)}
              placeholder="Auto-generated"
            />

            {/* DESCRIPTION */}
            <label style={{ fontWeight: "bold", marginTop: 12 }}>
              Description
            </label>
            <textarea
              style={{ ...inputStyle, height: 80 }}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Short description"
            />

            {/* PREREQUISITES */}
            <label style={{ fontWeight: "bold", marginTop: 12 }}>
              Prerequisites
            </label>
            <select
              multiple
              style={{ ...inputStyle, height: 100 }}
              value={form.prerequisites}
              onChange={(e) => {
                const opts = Array.from(e.target.selectedOptions).map(
                  (o) => o.value
                );
                setField("prerequisites", opts);
              }}
            >
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.id})
                </option>
              ))}
            </select>

            {/* BUTTONS */}
            <div style={{ marginTop: 18, textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  padding: "8px 14px",
                  marginRight: 10,
                  borderRadius: 6,
                  border: "1px solid #aaa",
                  background: "#eee"
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                style={{
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: "none",
                  background: "#2563eb",
                  color: "white"
                }}
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    );

  /* =============================
        RETURN UI
  ============================= */
  return (
    <div style={{ padding: 20 }}>
      <h1>Topics</h1>

      {/* ADD TOPIC BUTTON */}
      <button
        onClick={() => {
          setForm({ id: "", name: "", description: "", prerequisites: [] });
          setModalOpen(true);
        }}
        style={{
          padding: "10px 16px",
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "8px",
          marginBottom: 20,
          cursor: "pointer"
        }}
      >
        + Add Topic
      </button>

      {/* TOPIC CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "16px"
        }}
      >
        {topics.map((t) => (
          <div
            key={t.id}
            style={{
              background: "white",
              padding: 16,
              borderRadius: 12,
              boxShadow: "0 4px 10px rgba(0,0,0,0.08)"
            }}
          >
            <h3 style={{ margin: 0 }}>{t.name}</h3>
            <div style={{ fontSize: 13, color: "#666" }}>{t.id}</div>

            <p style={{ fontSize: 14, marginTop: 10 }}>
              {t.description || "No description provided."}
            </p>

            <div style={{ fontSize: 12, marginTop: 10, opacity: 0.7 }}>
              Prerequisites: {t.prerequisites?.join(", ") || "None"}
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
              <button
                onClick={() => editTopic(t)}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: "6px",
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                Edit
              </button>

              <button
                onClick={() => delTopic(t.id)}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: "6px",
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* POPUP MODAL */}
      <TopicModal />
    </div>
  );
}
