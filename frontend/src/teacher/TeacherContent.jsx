// frontend/src/teacher/TeacherContent.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
const API_BASE = "https://page-jirk.onrender.com";

export default function TeacherContent() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [contents, setContents] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);

  // ---------- Schedule modal state ----------
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleTopicId, setScheduleTopicId] = useState(null);
  const [scheduleOpenAt, setScheduleOpenAt] = useState("");
  const [scheduleCloseAt, setScheduleCloseAt] = useState("");
  const [scheduleManualLock, setScheduleManualLock] = useState(false);
  const [savingScheduleModal, setSavingScheduleModal] = useState(false);

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

  function goTopic(topicId, tab = "content") {
    navigate(`/teacher/content/${topicId}?tab=${encodeURIComponent(tab)}`);
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

  async function deleteTopic(topicId) {
    const ok = confirmTypeDelete("Delete this topic and all its contents?");
    if (!ok) return;

    try {
      await fetch(`${API_BASE}/topics/${topicId}`, { method: "DELETE" });
      await loadAll();
      alert("Deleted topic");
    } catch (err) {
      console.error(err);
      alert("Failed to delete topic");
    }
  }

  function confirmTypeDelete(message = "This action is permanent.") {
    const ok = confirm(`${message}\n\nYou will be asked to type DELETE to confirm.`);
    if (!ok) return false;
    const typed = prompt('Type DELETE to confirm:');
    return (typed || "").trim().toUpperCase() === "DELETE";
  }

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 10 }}>📚 Manage Learning Materials</h1>
    
      {/* FILTER ROW */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 16,
          marginBottom: 20,
          width: "100%",
        }}
      >
        {/* LEFT GROUP: term + search share the row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 16,
            flexGrow: 1,
          }}
        >
          {/* TERM DROPDOWN */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontWeight: 600, marginBottom: 4 }}>
              Grading period
            </label>

            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #ccc",
                minWidth: 150,
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
            <label
              style={{
                fontWeight: 600,
                marginBottom: 4,
                display: "block",
              }}
            >
              Search
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search topics..."
              style={{
                width: "100%",          // fill remaining space
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 14,
              }}
            />
          </div>
        </div>
      </div>

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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); goTopic(topic.id, "content"); }}
                    style={{ background: "#2563eb", color: "white", border: "none", padding: "10px", borderRadius: 8, cursor: "pointer", width: "100%" }}
                  >
                    ➕ Add/Edit Resource
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
                    onClick={(e) => { e.stopPropagation(); goTopic(topic.id, "assessment"); }}
                    style={{ background: "#f97316", color: "white", border: "none", padding: "10px", borderRadius: 8, cursor: "pointer", width: "100%" }}
                  >
                    📝 Manage Assessment
                  </button>
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
