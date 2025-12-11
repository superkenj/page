// frontend/src/teacher/TeacherContent.jsx
import { useEffect, useState, useMemo } from "react";
import CompactAssessmentModal from "./CompactAssessmentModal";
const API_BASE = "https://page-jirk.onrender.com";

export default function TeacherContent() {
  const [topics, setTopics] = useState([]);
  const [contents, setContents] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);

  // Add Content Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalTopic, setModalTopic] = useState(""); // preselect topic id
  const [modalLinks, setModalLinks] = useState([{ link: "", type: "video", description: "" }]);
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [assessmentTopicId, setAssessmentTopicId] = useState(null);

  // ---------- Schedule modal state ----------
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleTopicId, setScheduleTopicId] = useState(null);
  const [scheduleOpenAt, setScheduleOpenAt] = useState("");
  const [scheduleCloseAt, setScheduleCloseAt] = useState("");
  const [scheduleManualLock, setScheduleManualLock] = useState(false);
  const [savingScheduleModal, setSavingScheduleModal] = useState(false);

  // Inline edit for content items
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ link: "", type: "video", description: "" });

  // Search
  const [query, setQuery] = useState("");

  // Global term filter
  const [selectedTerm, setSelectedTerm] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([
        fetch(`${API_BASE}/topics/list`),
        fetch(`${API_BASE}/content`)
      ]);
      const tJson = await tRes.json();
      const cJson = await cRes.json();
      setTopics(Array.isArray(tJson) ? tJson : tJson.topics || []);
      setContents(Array.isArray(cJson) ? cJson : cJson.contents || []);
    } catch (err) {
      console.error("Failed to load topics/contents:", err);
      alert("Failed to load data. See console.");
    } finally {
      setLoading(false);
    }
  }

  function termRank(term) {
    if (!term) return 999;
    const map = { "1st": 1, "2nd": 2, "3rd": 3, "4th": 4 };
    return map[term] ?? 999;
  }

  // Group contents by topic (keep topics order sorted by prerequisites like Topics.jsx)
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

  const grouped = useMemo(() => {
    return sortedTopics.map((t) => ({
      ...t,
      materials: contents.filter((c) => c.topic_id === t.id)
    }));
  }, [sortedTopics, contents]);

  // Visible topics by search
  const visible = grouped.filter((t) =>
    selectedTerm && t.term === selectedTerm && (
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.id.toLowerCase().includes(query.toLowerCase())
    )
  );

  // Modal helpers
  function addModalLink() {
    setModalLinks((s) => [...s, { link: "", type: "video", description: "" }]);
  }
  function removeModalLink(i) {
    setModalLinks((s) => s.filter((_, idx) => idx !== i));
  }
  function updateModalLink(i, val) {
    setModalLinks((s) => {
      const copy = [...s];
      copy[i] = val;
      return copy;
    });
  }

  function openAssessmentModal(topicId) {
    setAssessmentTopicId(topicId);
    setAssessmentModalOpen(true);
  }

  function closeAssessmentModal() {
    setAssessmentTopicId(null);
    setAssessmentModalOpen(false);
  }

  async function onAssessmentSaved() {
    // optional: refresh list or show toast
    await loadAll();
  }

  // Helper: convert an ISO string like "2025-12-02T06:00:00.000Z"
  // into a "YYYY-MM-DDTHH:MM" string suitable for <input type="datetime-local"> (local time)
  function isoUtcToLocalDatetimeInput(iso) {
    if (!iso) return "";
    try {
      const d = new Date(iso); // parsed as UTC
      const pad = (n) => String(n).padStart(2, "0");
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hour = pad(d.getHours());
      const minute = pad(d.getMinutes());
      return `${year}-${month}-${day}T${hour}:${minute}`;
    } catch (e) {
      return "";
    }
  }

  // Open the schedule modal for a topic (prefill using topic data)
  function openScheduleModal(topic) {
    setScheduleTopicId(topic.id);
    setScheduleOpenAt(topic.open_at ? isoUtcToLocalDatetimeInput(topic.open_at) : "");
    setScheduleCloseAt(topic.close_at ? isoUtcToLocalDatetimeInput(topic.close_at) : "");
    setScheduleManualLock(!!topic.manual_lock);
    setScheduleModalOpen(true);
  }

  async function saveScheduleModal() {
    if (!scheduleTopicId) return;
    setSavingScheduleModal(true);
    try {
      const payload = {
        open_at: scheduleOpenAt ? new Date(scheduleOpenAt).toISOString() : null,
        close_at: scheduleCloseAt ? new Date(scheduleCloseAt).toISOString() : null,
        manual_lock: !!scheduleManualLock
      };

      const res = await fetch(`${API_BASE}/topics/${scheduleTopicId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed to save schedule");
      }

      // refresh lists and close modal
      await loadAll();
      setScheduleModalOpen(false);
      setScheduleTopicId(null);
      alert("Schedule saved.");

      // Notify student dashboards to refresh immediately
      window.dispatchEvent(new Event("studentDataUpdated"));
      window.dispatchEvent(new Event("studentPathUpdated"));
    } catch (err) {
      console.error("saveScheduleModal error", err);
      alert("Failed to save schedule.");
    } finally {
      setSavingScheduleModal(false);
    }
  }

  async function tempOpenTopicFromModal(days = 3) {
    if (!scheduleTopicId) return;
    if (!confirm(`Open topic for all students for ${days} day(s)?`)) return;
    try {
      const res = await fetch(`${API_BASE}/topics/${scheduleTopicId}/temporary-open-class`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days, createdBy: "teacher-ui" }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed to temp-open");
      }
      alert("Topic temporarily opened for class.");
      // refresh topics to show immediate effect if needed
      await loadAll();
      setScheduleModalOpen(false);

      // Notify student dashboards to refresh (they will read /students/:id/overrides)
      window.dispatchEvent(new Event("studentDataUpdated"));
      window.dispatchEvent(new Event("studentPathUpdated"));
    } catch (err) {
      console.error("tempOpenTopicFromModal error", err);
      alert("Failed to open temporarily.");
    }
  }

  async function handleAddContentSave() {
    if (!modalTopic) { alert("Choose a topic."); return; }
    const valid = modalLinks.filter(l => l.link.trim());
    if (!valid.length) { alert("Add at least one link."); return; }

    try {
      for (const item of valid) {
        await fetch(`${API_BASE}/content`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic_id: modalTopic,
            title: topics.find(t => t.id === modalTopic)?.name || "Untitled",
            description: item.description || "",
            link: item.link,
            type: item.type,
            created_by: "teacher",
          })
        });
      }
      setShowAddModal(false);
      setModalLinks([{ link: "", type: "video", description: "" }]);
      setModalTopic("");
      await loadAll();
      alert("Content added.");
    } catch (err) {
      console.error(err);
      alert("Failed to add content.");
    }
  }

  // Inline editing
  function startEdit(m) {
    setEditingId(m.id);
    setEditData({ link: m.link || "", type: m.type || "video", description: m.description || "" });
  }
  function cancelEdit() {
    setEditingId(null);
    setEditData({ link: "", type: "video", description: "" });
  }
  async function saveEdit(itemId) {
    try {
      await fetch(`${API_BASE}/content/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      await loadAll();
      setEditingId(null);
      alert("Updated");
    } catch (err) {
      console.error(err);
      alert("Failed to update");
    }
  }

  async function deleteContent(itemId) {
    if (!confirm("Delete this content?")) return;
    try {
      await fetch(`${API_BASE}/content/${itemId}`, { method: "DELETE" });
      setContents((s) => s.filter(c => c.id !== itemId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete content");
    }
  }

  async function deleteTopic(topicId) {
    if (!confirm("Delete this topic and all its contents?")) return;
    try {
      // delete topic via backend (which also deletes its contents)
      await fetch(`${API_BASE}/topics/${topicId}`, { method: "DELETE" });
      await loadAll();
      alert("Deleted topic");
    } catch (err) {
      console.error(err);
      alert("Failed to delete topic");
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 10 }}>📚 Manage Learning Materials</h1>
    
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "flex-end",
          marginBottom: 18,
        }}
      >
        {/* TERM DROPDOWN */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label
            style={{
              fontSize: 14,
              fontWeight: "bold",
              marginBottom: 4,
            }}
          >
            Grading period
          </label>

          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ccc",
              minWidth: 180,
              fontSize: 15,
            }}
          >
            <option value="">Select term...</option>
            <option value="1st">1st Grading</option>
            <option value="2nd">2nd Grading</option>
            <option value="3rd">3rd Grading</option>
            <option value="4th">4th Grading</option>
          </select>
        </div>

        {/* SEARCH */}
        <div style={{ flex: 1 }}>
          <label
            style={{
              fontSize: 14,
              fontWeight: "bold",
              marginBottom: 4,
              display: "block",
            }}
          >
            Search
          </label>

          <input
            placeholder="Search topics..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ccc",
              fontSize: 15,
            }}
          />
        </div>
      </div>

      {/* Add Content Modal (reused for adding any topic; preselect by clicking card button) */}
      {showAddModal && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <h3 style={{ marginTop: 0 }}>{modalTopic ? `Add content to "${topics.find(t=>t.id===modalTopic)?.name || modalTopic}"` : "Add Content"}</h3>

            <label style={labelStyle}>Topic</label>
            <select
              value={modalTopic}
              onChange={e => setModalTopic(e.target.value)}
              style={inputStyle}
            >
              <option value="">-- Select Topic --</option>
              {topics
                .filter((t) => !selectedTerm || t.term === selectedTerm) // ⬅️ only current term’s topics
                .map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>

            <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              Topics follow the order set in the selected term. This resource will be shown under the chosen topic.
            </p>

            {modalLinks.map((it, i) => (
              <div key={i} style={{ marginTop: 12, background: "#fff", padding: 10, borderRadius: 8, border: "1px solid #e6eefc" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input
                    placeholder={`Resource link #${i + 1}`}
                    value={it.link}
                    onChange={e => updateModalLink(i, { ...it, link: e.target.value })}
                    style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
                  />
                  <select
                    value={it.type}
                    onChange={e => updateModalLink(i, { ...it, type: e.target.value })}
                    style={{ padding: 8, borderRadius: 6 }}
                  >
                    <option value="video">Video</option>
                    <option value="presentation">Presentation</option>
                    <option value="pdf">PDF</option>
                    <option value="link">Link</option>
                  </select>
                  {modalLinks.length > 1 && (
                    <button
                      onClick={() => removeModalLink(i)}
                      style={{ background: "#ef4444", color: "white", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}
                    >
                      ✖
                    </button>
                  )}
                </div>
                <textarea
                  placeholder="Short description..."
                  value={it.description}
                  onChange={(e) =>
                    updateModalLink(i, { ...it, description: e.target.value })
                  }
                  style={{
                    gridColumn: "1 / span 2",
                    width: "100%",
                    padding: 8,
                    borderRadius: 6,
                    border: "1px solid #ccc",
                    resize: "vertical",
                    boxSizing: "border-box"   // ★ prevents overflow
                  }}
                />
              </div>
            ))}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={addModalLink} style={{ background: "#2563eb", color: "white", border: "none", padding: "8px 12px", borderRadius: 8 }}>➕ Add Another</button>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button onClick={() => setShowAddModal(false)} style={{ background: "#ddd", border: "none", padding: "8px 12px", borderRadius: 8 }}>Cancel</button>
                <button onClick={handleAddContentSave} style={{ background: "#16a34a", color: "white", border: "none", padding: "8px 12px", borderRadius: 8 }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {scheduleModalOpen && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <h3 style={{ marginTop: 0 }}>{scheduleTopicId ? `Schedule — ${topics.find(t=>t.id===scheduleTopicId)?.name || scheduleTopicId}` : "Schedule"}</h3>

            <label style={labelStyle}>Open at (local)</label>
            <input type="datetime-local" value={scheduleOpenAt} onChange={e => setScheduleOpenAt(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Close at (local)</label>
            <input type="datetime-local" value={scheduleCloseAt} onChange={e => setScheduleCloseAt(e.target.value)} style={inputStyle} />

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <input id="sched-manual" type="checkbox" checked={scheduleManualLock} onChange={e => setScheduleManualLock(e.target.checked)} />
              <label htmlFor="sched-manual" style={{ fontWeight: 600 }}>Manual lock</label>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={() => { setScheduleModalOpen(false); }} style={{ background: "#ddd", padding: "8px 12px", borderRadius: 6 }}>Cancel</button>
              <button onClick={saveScheduleModal} disabled={savingScheduleModal} style={{ background: "#2563eb", color: "#fff", padding: "8px 12px", borderRadius: 6 }}>
                {savingScheduleModal ? "Saving..." : "Save Schedule"}
              </button>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button onClick={() => tempOpenTopicFromModal(1)} style={{ background: "#06b6d4", color: "#fff", padding: "8px 12px", borderRadius: 6 }}>Open 1 day</button>
                <button onClick={() => tempOpenTopicFromModal(3)} style={{ background: "#0ea5a4", color: "#fff", padding: "8px 12px", borderRadius: 6 }}>Open 3 days</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Topics cards grid */}
      <div style={cardsWrapper}>
        {visible.map((topic) => (
          <div key={topic.id} style={topicCard}>
            <div onClick={() => setExpanded(prev => ({ ...prev, [topic.id]: !prev[topic.id] }))} style={{ cursor: "pointer" }}>
              <h3 style={{ margin: 0 }}>{topic.name}</h3>
              <p style={{ color: "#555", marginTop: 8 }}>{topic.description}</p>
            </div>

            {/* Expand content area */}
            {expanded[topic.id] && (
              <div style={{ marginTop: 12 }}>
                {/* Mini cards for materials */}
                {topic.materials.length === 0 ? (
                  <div style={{ color: "#6b7280", padding: 12 }}>No materials yet.</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                    {topic.materials.map((m) => (
                      <div key={m.id} style={miniCard}>
                        {editingId === m.id ? (
                          <>
                            <div style={{ marginBottom: 8 }}>
                              <select value={editData.type} onChange={e => setEditData(d => ({ ...d, type: e.target.value }))} style={{ padding: 6, borderRadius: 6 }}>
                                <option value="video">Video</option>
                                <option value="presentation">Presentation</option>
                                <option value="pdf">PDF</option>
                                <option value="link">Link</option>
                              </select>
                            </div>
                            <input value={editData.link} onChange={e => setEditData(d => ({ ...d, link: e.target.value }))} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc", marginBottom: 8 }} />
                            <textarea value={editData.description} onChange={e => setEditData(d => ({ ...d, description: e.target.value }))} rows={3} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc", marginBottom: 8 }} />
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={() => saveEdit(m.id)} style={{ background: "#16a34a", color: "white", border: "none", padding: "6px 10px", borderRadius: 6 }}>💾 Save</button>
                              <button onClick={cancelEdit} style={{ background: "#9ca3af", color: "white", border: "none", padding: "6px 10px", borderRadius: 6 }}>Cancel</button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <strong style={{ textTransform: "uppercase", fontSize: 12 }}>{m.type || "LINK"}</strong>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={(e) => { e.stopPropagation(); startEdit(m); }} style={miniEditBtn}>✏️</button>
                                <button onClick={(e) => { e.stopPropagation(); deleteContent(m.id); }} style={miniDeleteBtn}>🗑️</button>
                              </div>
                            </div>
                            <a href={m.link} target="_blank" rel="noreferrer" style={{ wordBreak: "break-all", display: "block", marginTop: 8, color: "#1e40af" }}>{m.link}</a>
                            <p style={{ marginTop: 8, color: "#444" }}>{m.description}</p>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* action row under materials */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setModalTopic(topic.id); setShowAddModal(true); }}
                    style={{ background: "#2563eb", color: "white", border: "none", padding: "10px", borderRadius: 8, cursor: "pointer", width: "100%" }}
                  >
                    ➕ Add Resource
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); deleteTopic(topic.id); }}
                    style={{ background: "#ef4444", color: "white", border: "none", padding: "10px", borderRadius: 8, cursor: "pointer", width: "100%" }}
                  >
                    🗑️ Delete Topic
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); openScheduleModal(topic); }}
                    style={{ background: "#06b6d4", color: "white", border: "none", padding: "10px", borderRadius: 8, cursor: "pointer", width: "100%" }}
                  >
                    🗓 Manage Schedule
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); setModalTopic(topic.id); openAssessmentModal(topic.id); }}
                    style={{ background: "#f97316", color: "white", border: "none", padding: "10px", borderRadius: 8, cursor: "pointer", width: "100%" }}
                  >
                    📝 Manage Assessment
                  </button>

                  <div style={{ gridColumn: "1 / -1", justifySelf: "end", fontSize: 13, color: "#666", marginTop: 4 }}>
                    {topic.materials.length} resource{topic.materials.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            )}

            {/* collapse hint */}
            {!expanded[topic.id] && (
              <div style={{ marginTop: 12, color: "#6b7280", fontSize: 13 }}>
                Click the card to view materials
              </div>
            )}
          </div>
        ))}
        {assessmentModalOpen && (
          <CompactAssessmentModal
            topicId={assessmentTopicId}
            onClose={closeAssessmentModal}
            onSaved={onAssessmentSaved}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */

const cardsWrapper = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(320px, 1fr))",
  gap: 24,
  paddingTop: 12,
  paddingBottom: 40,
  alignItems: "start",
};

const topicCard = {
  background: "white",
  padding: 20,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  transition: "transform 0.18s ease, box-shadow 0.18s ease",
  display: "flex",
  flexDirection: "column",
  cursor: "default",
  alignSelf: "start",
  minHeight: 220,
  boxSizing: "border-box",
};

const miniCard = {
  background: "#fff",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #eef2ff",
  boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
  display: "flex",
  flexDirection: "column",
};

const miniEditBtn = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "6px 8px",
  borderRadius: 6,
  cursor: "pointer"
};

const miniDeleteBtn = {
  background: "#ef4444",
  color: "white",
  border: "none",
  padding: "6px 8px",
  borderRadius: 6,
  cursor: "pointer"
};

const modalOverlay = {
  position: "fixed",
  top: 0, left: 0,
  width: "100vw", height: "100vh",
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999
};

const modalCard = {
  background: "#fff",
  padding: 20,
  borderRadius: 14,
  width: "640px",
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
  boxSizing: "border-box"
};

const labelStyle = { display: "block", fontWeight: 600, marginTop: 8, marginBottom: 6 };
const inputStyle = { width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc", boxSizing: "border-box" };
