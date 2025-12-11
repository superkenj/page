import { useEffect, useState, useMemo } from "react";
const API_BASE = "https://page-jirk.onrender.com";

export default function Topics() {
  const [topics, setTopics] = useState([]);
  const [form, setForm] = useState({
    id: "",
    name: "",
    description: "",
    prerequisites: [],
    term: "",              // ⬅️ NEW
  });
  const [editing, setEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [query, setQuery] = useState("");

  const [selectedTerm, setSelectedTerm] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch(`${API_BASE}/topics/list`);
    const data = await res.json();
    setTopics(data);
  }

  function setField(k, v) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function generateIdFromName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .trim()
      .split(/\s+/)
      .map(w => w.slice(0, 3))
      .join("_")
      .slice(0, 20);
  }

  async function save(e) {
    e.preventDefault();
    if (!form.name) return alert("Topic name required.");
    if (!form.term) return alert("Please select a grading period.");

    const payload = {
      name: form.name,
      description: form.description,
      prerequisites: form.prerequisites,
      term: form.term,
    };

    await fetch(`${API_BASE}/topics/${form.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setShowModal(false);
    setEditing(false);
    setForm({ id: "", name: "", description: "", prerequisites: [], term: "" });
    await load();
  }

  function handleAddTopic() {
    setShowAddTopicModal(true);
  }

  function editTopic(t) {
    setEditing(true);
    setForm({
      id: t.id,
      name: t.name,
      description: t.description || "",
      prerequisites: t.prerequisites || [],
      term: t.term || "",
    });
    setShowModal(true);
  }

  async function delTopic(id) {
    if (!confirm("Delete " + id + "?")) return;
    await fetch(`${API_BASE}/topics/${id}`, { method: "DELETE" });
    await load();
  }

  function termRank(term) {
    if (!term) return 999;
    const map = { "1st": 1, "2nd": 2, "3rd": 3, "4th": 4 };
    return map[term] ?? 999;
  }

  const sortedTopics = useMemo(() => {
    return [...topics].sort((a, b) => {
      const ta = termRank(a.term);
      const tb = termRank(b.term);
      if (ta !== tb) return ta - tb;

      const oa = typeof a.order === "number" ? a.order : 999;
      const ob = typeof b.order === "number" ? b.order : 999;
      return oa - ob;
    });
  }, [topics]);

  const visibleTopics = sortedTopics
    .filter(t => selectedTerm && t.term === selectedTerm) // ⬅️ only topics in the term
    .filter(t =>
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.id.toLowerCase().includes(query.toLowerCase())
    );

  /* ✅ MAP OF ID → NAME FOR PREREQUISITE DISPLAY */
  const topicNameMap = useMemo(() => {
    const map = {};
    topics.forEach(t => { map[t.id] = t.name; });
    return map;
  }, [topics]);

  return (
    <div style={{ padding: 20, maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
      <h1>Topics</h1>

      {/* FILTER ROW */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 16,
          marginBottom: 20,
        }}
      >

        {/* TERM DROPDOWN */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label style={{ fontWeight: 600, marginBottom: 4 }}>Grading period</label>

          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #ccc",
              minWidth: 150,   // DOES NOT stretch too wide
              fontSize: 14,
            }}
          >
            <option value="">Select term...</option>
            <option value="1st">1st Grading</option>
            <option value="2nd">2nd Grading</option>
            <option value="3rd">3rd Grading</option>
            <option value="4th">4th Grading</option>
          </select>
        </div>

        {/* SEARCH BAR */}
        <div style={{ flexGrow: 1 }}>
          <label style={{ fontWeight: 600, marginBottom: 4, display: "block" }}>Search</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics..."
            style={{
              width: "100%",
              maxWidth: 400,     // stops the search bar from being too wide
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #ccc",
              fontSize: 14,
            }}
          />
        </div>

        {/* ADD BUTTON — ALWAYS VISIBLE */}
        <button
          onClick={handleAddTopic}  // CHANGE THIS NAME IF NEEDED
          style={{
            background: "#2563eb",
            color: "white",
            padding: "10px 14px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            whiteSpace: "nowrap",
            height: "fit-content",
          }}
        >
          + Add
        </button>

      </div>

      {/* MODAL */}
      {showModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h2>{editing ? "Edit Topic" : "Add Topic"}</h2>

            <form onSubmit={save}>
              {/* NAME */}
              <label style={labelStyle}>Topic Name</label>
              <input
                style={inputStyle}
                value={form.name}
                onChange={e => {
                  const name = e.target.value;
                  setField("name", name);

                  if (!editing) {
                    setField("id", generateIdFromName(name));
                  }
                }}
                placeholder="Enter topic name"
              />

              {/* ID */}
              <label style={labelStyle}>Topic ID</label>
              <input
                style={inputStyle}
                value={form.id}
                onChange={e => setField("id", e.target.value)}
              />

              {/* TERM */}
              <label style={labelStyle}>Grading period</label>
              <select
                style={inputStyle}
                value={form.term}
                onChange={(e) => setField("term", e.target.value)}
              >
                <option value="">-- Select term --</option>
                <option value="1st">1st Grading</option>
                <option value="2nd">2nd Grading</option>
                <option value="3rd">3rd Grading</option>
                <option value="4th">4th Grading</option>
              </select>
              <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                The order within this term decides how topics will be tackled consecutively.
              </p>

              {/* DESCRIPTION */}
              <label style={labelStyle}>Description</label>
              <textarea
                style={{ ...inputStyle, height: 80 }}
                value={form.description}
                onChange={e => setField("description", e.target.value)}
              />

              {/* PREREQUISITES */}
              <label style={labelStyle}>Prerequisites</label>
              <div style={{ ...inputStyle, height: 160, overflowY: "auto", padding: "10px", borderRadius: 8 }}>
                {[...sortedTopics].reverse().map(t => (
                  <label
                    key={t.id}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer" }}
                  >
                    <input
                      type="checkbox"
                      checked={form.prerequisites.includes(t.id)}
                      onChange={() => {
                        if (form.prerequisites.includes(t.id)) {
                          setField("prerequisites", form.prerequisites.filter(p => p !== t.id));
                        } else {
                          setField("prerequisites", [...form.prerequisites, t.id]);
                        }
                      }}
                      style={{ width: 16, height: 16, cursor: "pointer" }}
                    />
                    {t.name} ({t.id})
                  </label>
                ))}
              </div>

              {/* BUTTONS */}
              <div style={modalBtns}>
                <button type="button" onClick={() => setShowModal(false)} style={cancelBtn}>Cancel</button>
                <button type="submit" style={saveBtn}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!selectedTerm && (
        <p style={{ marginTop: 16, color: "#6b7280" }}>
          Select a grading period to view topics.
        </p>
      )}

      {/* TOPIC CARDS */}
      <div style={cardsWrapper}>
        {visibleTopics.map(t => (
          <div
            key={t.id}
            style={topicCard}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
            }}
          >
            <div>
              <h3 style={{ marginTop: 0 }}>{t.name}</h3>

              <p style={{ fontSize: 14, color: "#555", lineHeight: "20px" }}>
                {t.description}
              </p>
            </div>

            {/* ✅ PREREQUISITE NAMES HERE */}
            <div style={{ marginTop: "auto", fontSize: 13, color: "#444" }}>
              <strong>Prerequisites:</strong>{" "}
              {t.prerequisites?.length
                ? t.prerequisites.map(id => topicNameMap[id] || id).join(", ")
                : "None"}
            </div>

            <div style={cardBtns}>
              <button onClick={() => editTopic(t)} style={editBtn}>Edit</button>
              <button onClick={() => delTopic(t.id)} style={deleteBtn}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */

const labelStyle = {
  fontSize: 14,
  fontWeight: "bold",
  marginTop: 12,
  display: "block"
};

const modalOverlay = {
  position: "fixed",
  top: 0, left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999
};

const modalContent = {
  background: "#fff",
  padding: 20,
  borderRadius: "20px",
  width: "520px",
  maxHeight: "90vh",
  overflowY: "auto",
  boxSizing: "border-box",
  boxShadow: "0 6px 20px rgba(0,0,0,0.15)"
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: 8,
  border: "1px solid #ccc",
  marginTop: 6,
  boxSizing: "border-box"
};

const cardsWrapper = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "24px",
  paddingTop: "20px",
  paddingBottom: "40px",
};

const topicCard = {
  background: "white",
  padding: "20px",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  transition: "0.25s ease",
  display: "flex",
  flexDirection: "column",
  minHeight: "260px",
  cursor: "default",
};

const cardBtns = {
  marginTop: "auto",
  display: "flex",
  gap: 10
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

const saveBtn = {
  padding: "8px 14px",
  background: "#2563eb",
  color: "white",
  borderRadius: 8,
  border: "none",
  cursor: "pointer"
};

const cancelBtn = {
  padding: "8px 14px",
  background: "#ddd",
  borderRadius: 8,
  border: "none",
  cursor: "pointer"
};

const modalBtns = {
  marginTop: 20,
  display: "flex",
  justifyContent: "flex-end",
  gap: 10
};
