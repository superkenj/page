import { useEffect, useState, useMemo } from "react";
const API_BASE = "https://page-jirk.onrender.com";

export default function Topics() {
  const [topics, setTopics] = useState([]);
  const [form, setForm] = useState({ id: "", name: "", description: "", prerequisites: [] });
  const [editing, setEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // ---------- Load Topics ----------
  useEffect(() => { load(); }, []);
  async function load() {
    const res = await fetch(`${API_BASE}/topics/list`);
    const data = await res.json();
    setTopics(data);
  }

  function setField(k, v) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  // ---------- Save ----------
  async function save(e) {
    e.preventDefault();
    if (!form.name) return alert("Topic name required.");

    const payload = {
      name: form.name,
      description: form.description,
      prerequisites: form.prerequisites,
    };

    await fetch(`${API_BASE}/topics/${form.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setShowModal(false);
    setEditing(false);
    setForm({ id: "", name: "", description: "", prerequisites: [] });
    await load();
  }

  // ---------- Edit Topic ----------
  function editTopic(t) {
    setEditing(true);
    setForm({
      id: t.id,
      name: t.name,
      description: t.description || "",
      prerequisites: t.prerequisites || [],
    });
    setShowModal(true);
  }

  // ---------- Delete ----------
  async function delTopic(id) {
    if (!confirm("Delete " + id + "?")) return;
    await fetch(`${API_BASE}/topics/${id}`, { method: "DELETE" });
    await load();
  }

  // ---------- Group Topics (no cluster) ----------
  const clusters = useMemo(() => {
    return { "All Topics": topics };
  }, [topics]);

  return (
    <div style={{ padding: 20 }}>
      <h1>Topics</h1>

      {/* ADD TOPIC BUTTON */}
      <button
        onClick={() => {
          setEditing(false);
          setForm({ id: "", name: "", description: "", prerequisites: [] });
          setShowModal(true);
        }}
        style={{
          background: "#2563eb",
          color: "white",
          padding: "10px 16px",
          border: "none",
          borderRadius: 8,
          marginBottom: 18,
          cursor: "pointer"
        }}
      >
        + Add Topic
      </button>

      {/* ---------- MODAL ---------- */}
      {showModal && (
        <div style={{
          position: "fixed",
          top: 0, left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999
        }}>
          <div style={{
            background: "#fff",
            padding: 20,
            borderRadius: 12,
            width: "500px",
            maxHeight: "90vh",
            overflowY: "auto"
          }}>
            <h2 style={{ marginTop: 0 }}>
              {editing ? "Edit Topic" : "Add Topic"}
            </h2>

            <form onSubmit={save}>

              {/* NAME */}
              <label>Topic Name</label>
              <input
                style={inputStyle}
                value={form.name}
                onChange={e => {
                  const name = e.target.value;
                  setField("name", name);

                  if (!editing) {
                    const suggested = name
                      .toLowerCase()
                      .replace(/[^a-z ]/g, "")
                      .trim()
                      .replace(/\s+/g, "_")
                      .slice(0, 20);
                    setField("id", suggested);
                  }
                }}
                placeholder="Enter topic name"
              />

              {/* ID */}
              <label style={{ marginTop: 10 }}>Topic ID</label>
              <input
                style={{ ...inputStyle, background: "#f8f8f8" }}
                value={form.id}
                onChange={e => setField("id", e.target.value)}
                placeholder="Auto-generated"
              />

              {/* DESCRIPTION */}
              <label style={{ marginTop: 10 }}>Description</label>
              <textarea
                style={{ ...inputStyle, height: 80 }}
                value={form.description}
                onChange={e => setField("description", e.target.value)}
              />

              {/* PREREQUISITES */}
              <label style={{ marginTop: 10 }}>Prerequisites</label>
              <select
                multiple
                value={form.prerequisites}
                onChange={e => {
                  const opts = Array.from(e.target.selectedOptions).map(o => o.value);
                  setField("prerequisites", opts);
                }}
                style={{ ...inputStyle, height: 140 }}
              >
                {topics.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.id})
                  </option>
                ))}
              </select>

              {/* BUTTONS */}
              <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setShowModal(false)} style={cancelBtn}>
                  Cancel
                </button>
                <button type="submit" style={saveBtn}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- TOPIC LIST ---------- */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
        {topics.map(t => (
          <div key={t.id} style={topicCard}>
            <div>
              <h3 style={{ marginTop: 0 }}>{t.name}</h3>
              <div style={{ fontSize: 13, color: "#666" }}>{t.id}</div>
              <p>{t.description}</p>
              <div style={{ fontSize: 13 }}>
                <strong>Prerequisites:</strong> {t.prerequisites?.join(", ") || "None"}
              </div>
            </div>

            {/* BUTTONS at the BOTTOM */}
            <div style={{ marginTop: "auto", display: "flex", gap: 10 }}>
              <button onClick={() => editTopic(t)} style={editBtn}>Edit</button>
              <button onClick={() => delTopic(t.id)} style={deleteBtn}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Styles ----------
const inputStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: 8,
  border: "1px solid #ccc",
  marginTop: 5
};

const topicCard = {
  width: "300px",
  background: "white",
  padding: 20,
  borderRadius: 12,
  boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
  display: "flex",
  flexDirection: "column",
  height: "260px"
};

const editBtn = {
  background: "#2563eb",
  color: "white",
  padding: "8px 14px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  flex: 1
};

const deleteBtn = {
  background: "#dc2626",
  color: "white",
  padding: "8px 14px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  flex: 1
};

const cancelBtn = {
  padding: "8px 14px",
  background: "#ddd",
  borderRadius: 8,
  border: "none",
  cursor: "pointer"
};

const saveBtn = {
  padding: "8px 14px",
  background: "#2563eb",
  color: "white",
  borderRadius: 8,
  border: "none",
  cursor: "pointer"
};
