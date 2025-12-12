// frontend/src/teacher/TeacherTopicContents.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";

const API_BASE = "https://page-jirk.onrender.com";

export default function TeacherTopicContents() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // --- existing state
  const [topic, setTopic] = useState(null);
  const [contents, setContents] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ link: "", type: "", description: "" });

  // --- new state for tabs and assessment
  const [tab, setTab] = useState("content"); // "content" | "assessment"
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessment, setAssessment] = useState(null); // null = not loaded, {} = empty
  const [savingAssessment, setSavingAssessment] = useState(false);

  // practice bank state
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practice, setPractice] = useState(null); // null = not loaded
  const [savingPractice, setSavingPractice] = useState(false);

  // ---------- Add Resource modal ----------
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalLinks, setModalLinks] = useState([{ link: "", type: "video", description: "" }]);

  // ---------- Schedule modal ----------
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleOpenAt, setScheduleOpenAt] = useState("");
  const [scheduleCloseAt, setScheduleCloseAt] = useState("");
  const [scheduleManualLock, setScheduleManualLock] = useState(false);
  const [savingScheduleModal, setSavingScheduleModal] = useState(false);

  const [discussion, setDiscussion] = useState("");
  const [savingDiscussion, setSavingDiscussion] = useState(false);

  // load topic & contents (existing)
  useEffect(() => {
    async function loadData() {
      try {
        const [tRes, cRes] = await Promise.all([
          fetch(`${API_BASE}/topics/list`),
          fetch(`${API_BASE}/content/${topicId}`)
        ]);
        const tJson = await tRes.json();
        const found = Array.isArray(tJson) ? tJson.find((t) => t.id === topicId) : null;
        setTopic(found);
        setDiscussion(found?.discussion || "");
        const cJson = await cRes.json();
        setContents(cJson || []);

      } catch (err) {
        console.error("loadData error", err);
      }
    }
    loadData();
  }, [topicId]);

  // load assessment when tab switches to assessment
  useEffect(() => {
    if (tab !== "assessment") return;
    let mounted = true;

    async function loadAssessment() {
      setAssessmentLoading(true);
      try {
        const res = await fetch(`${API_BASE}/assessments/${topicId}`);
        if (res.ok) {
          const j = await res.json();
          if (mounted) setAssessment(j);
        } else {
          // No assessment yet — create skeleton
          if (mounted) setAssessment({
            topic_id: topicId,
            title: `${topic?.name || topicId} Assessment`,
            instructions: "",
            passing_score: 70,
            questions: []
          });
        }
      } catch (err) {
        console.error("Failed to load assessment:", err);
        if (mounted) setAssessment({
          topic_id: topicId,
          title: `${topic?.name || topicId} Assessment`,
          instructions: "",
          passing_score: 70,
          questions: []
        });
      } finally {
        if (mounted) setAssessmentLoading(false);
      }
    }

    loadAssessment();
    return () => { mounted = false; };
  }, [tab, topicId, topic]);

  // load practice config when tab switches to practice
  useEffect(() => {
    if (tab !== "practice") return;
    let mounted = true;

    async function loadPractice() {
      setPracticeLoading(true);
      try {
        const res = await fetch(`${API_BASE}/practice/${topicId}`);
        if (res.ok) {
          const j = await res.json();
          if (!mounted) return;
          setPractice(j);
        } else {
          // No practice yet — create skeleton
          if (!mounted) return;
          setPractice({
            topic_id: topicId,
            title: `${topic?.name || topicId} Practice`,
            instructions: "",
            passing_score: 70,
            questions: [],
          });
        }
      } catch (err) {
        console.error("Failed to load practice config:", err);
        if (!mounted) return;
        setPractice({
          topic_id: topicId,
          title: `${topic?.name || topicId} Practice`,
          instructions: "",
          passing_score: 70,
          questions: [],
        });
      } finally {
        if (mounted) setPracticeLoading(false);
      }
    }

    loadPractice();
    return () => {
      mounted = false;
    };
  }, [tab, topicId, topic]);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "content" || t === "assessment" || t === "practice") setTab(t);
  }, [searchParams]);

  // ---------------- Existing content edit functions ----------------
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

  async function saveDiscussion() {
    setSavingDiscussion(true);
    try {
      const res = await fetch(`${API_BASE}/topics/${topicId}/discussion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discussion }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error("saveDiscussion failed:", t);
        alert("Failed to save discussion.");
        return;
      }

      alert("Discussion saved.");
      // refresh topic (so it persists in state too)
      const tRes = await fetch(`${API_BASE}/topics/list`);
      const tJson = await tRes.json();
      const found = Array.isArray(tJson) ? tJson.find((t) => t.id === topicId) : null;
      setTopic(found);
    } catch (err) {
      console.error(err);
      alert("Failed to save discussion.");
    } finally {
      setSavingDiscussion(false);
    }
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

      const cRes = await fetch(`${API_BASE}/content/${topicId}`);
      const cJson = await cRes.json();
      setContents(cJson);
    } catch (err) {
      console.error(err);
      alert("Failed to update content.");
    }
  }

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

  // ---------------- Assessment helpers ----------------
  function addQuestion() {
    const qid = `q${Date.now()}`;
    setAssessment((a) => ({
      ...a,
      questions: [
        ...(a.questions || []),
        {
          question_id: qid,
          type: "multiple_choice",
          question: "",
          choices: ["", ""],
          answer: "",
          points: 1
        }
      ]
    }));
  }

  function updateQuestion(idx, patch) {
    setAssessment((a) => {
      const q = [...(a.questions || [])];
      q[idx] = { ...q[idx], ...patch };
      return { ...a, questions: q };
    });
  }

  function removeQuestion(idx) {
    setAssessment((a) => {
      const q = [...(a.questions || [])];
      q.splice(idx, 1);
      return { ...a, questions: q };
    });
  }

  // Save assessment to backend
  async function saveAssessment() {
    if (!assessment) return;
    if (!assessment.title || !Array.isArray(assessment.questions) || assessment.questions.length === 0) {
      alert("Please add a title and at least one question.");
      return;
    }

    setSavingAssessment(true);
    try {
      const payload = {
        topic_id: assessment.topic_id || topicId,
        title: assessment.title,
        instructions: assessment.instructions || "",
        passing_score: Number(assessment.passing_score || 70),
        questions: assessment.questions.map((q) => {
          // ensure minimal shape
          return {
            question_id: q.question_id,
            type: q.type,
            question: q.question,
            choices: q.choices || [],
            answer: q.answer,
            correct_order: q.correct_order || q.correct_order,
            points: q.points ?? 1
          };
        }),
      };

      const res = await fetch(`${API_BASE}/assessments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("saveAssessment error", err);
        alert("Failed to save assessment.");
      } else {
        alert("Assessment saved.");
        // reload assessment from server to pick up any normalization
        const fresh = await fetch(`${API_BASE}/assessments/${topicId}`);
        if (fresh.ok) setAssessment(await fresh.json());

        // notify student dashboards in case assessment visibility changed
        window.dispatchEvent(new Event("studentDataUpdated"));
        window.dispatchEvent(new Event("studentPathUpdated"));
      }
    } catch (err) {
      console.error("saveAssessment error", err);
      alert("Failed to save assessment.");
    } finally {
      setSavingAssessment(false);
    }
  }

    // ---------------- Practice helpers ----------------

  function addPracticeQuestion() {
    const qid = `p_${Date.now()}`;
    setPractice((p) => ({
      ...p,
      questions: [
        ...(p?.questions || []),
        {
          question_id: qid,
          type: "multiple_choice",
          question: "",
          choices: ["", ""],
          answer: "",
          points: 1,
        },
      ],
    }));
  }

  function updatePracticeQuestion(idx, patch) {
    setPractice((p) => {
      if (!p) return p;
      const q = [...(p.questions || [])];
      q[idx] = { ...q[idx], ...patch };
      return { ...p, questions: q };
    });
  }

  function removePracticeQuestion(idx) {
    setPractice((p) => {
      if (!p) return p;
      const q = [...(p.questions || [])];
      q.splice(idx, 1);
      return { ...p, questions: q };
    });
  }

  async function savePractice() {
    if (!practice) return;
    if (
      !practice.title ||
      !Array.isArray(practice.questions) ||
      practice.questions.length === 0
    ) {
      alert("Please add a title and at least one practice question.");
      return;
    }

    setSavingPractice(true);
    try {
      const payload = {
        topic_id: practice.topic_id || topicId,
        title: practice.title,
        instructions: practice.instructions || "",
        passing_score: Number(practice.passing_score || 70),
        questions: (practice.questions || []).map((q, idx) => ({
          question_id: q.question_id || `p_${idx}`,
          type: q.type || "multiple_choice",
          question: q.question || "",
          choices: q.choices || [],
          answer: q.answer,
          points: q.points ?? 1,
          correct_order: q.correct_order || null,
        })),
      };

      const res = await fetch(`${API_BASE}/practice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.text().catch(() => "");
        console.error("savePractice error", err);
        alert("Failed to save practice.");
      } else {
        alert("Practice saved.");
        // reload from server (to pick up normalization)
        const fresh = await fetch(`${API_BASE}/practice/${topicId}`);
        if (fresh.ok) setPractice(await fresh.json());

        // notify dashboards if needed later
        window.dispatchEvent(new Event("studentDataUpdated"));
        window.dispatchEvent(new Event("studentPathUpdated"));
      }
    } catch (err) {
      console.error("savePractice error", err);
      alert("Failed to save practice.");
    } finally {
      setSavingPractice(false);
    }
  }

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

  async function refreshContents() {
    const cRes = await fetch(`${API_BASE}/content/${topicId}`);
    const cJson = await cRes.json();
    setContents(cJson || []);
  }

  async function handleAddContentSave() {
    const valid = modalLinks.filter((l) => l.link.trim());
    if (!valid.length) {
      alert("Add at least one link.");
      return;
    }

    try {
      for (const item of valid) {
        await fetch(`${API_BASE}/content`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic_id: topicId,
            title: topic?.name || "Untitled",
            description: item.description || "",
            link: item.link,
            type: item.type,
            created_by: "teacher",
          }),
        });
      }

      setShowAddModal(false);
      setModalLinks([{ link: "", type: "video", description: "" }]);
      await refreshContents();
      alert("Content added.");
    } catch (err) {
      console.error(err);
      alert("Failed to add content.");
    }
  }

  function confirmTypeDelete(message = "This action is permanent.") {
    const ok = window.confirm(`${message}\n\nYou will be asked to type DELETE to confirm.`);
    if (!ok) return false;
    const typed = window.prompt("Type DELETE to confirm:");
    return (typed || "").trim().toUpperCase() === "DELETE";
  }

  async function deleteTopic() {
    const ok = confirmTypeDelete("Delete this topic and all its contents?");
    if (!ok) return;

    try {
      await fetch(`${API_BASE}/topics/${topicId}`, { method: "DELETE" });
      alert("Deleted topic.");
      navigate("/teacher/content");
    } catch (err) {
      console.error(err);
      alert("Failed to delete topic.");
    }
  }

  function isoUtcToLocalDatetimeInput(iso) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return "";
    }
  }

  function openScheduleModal() {
    setScheduleOpenAt(topic?.open_at ? isoUtcToLocalDatetimeInput(topic.open_at) : "");
    setScheduleCloseAt(topic?.close_at ? isoUtcToLocalDatetimeInput(topic.close_at) : "");
    setScheduleManualLock(!!topic?.manual_lock);
    setScheduleModalOpen(true);
  }

  async function saveScheduleModal() {
    setSavingScheduleModal(true);
    try {
      const payload = {
        open_at: scheduleOpenAt ? new Date(scheduleOpenAt).toISOString() : null,
        close_at: scheduleCloseAt ? new Date(scheduleCloseAt).toISOString() : null,
        manual_lock: !!scheduleManualLock,
      };

      const res = await fetch(`${API_BASE}/topics/${topicId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());

      alert("Schedule saved.");
      setScheduleModalOpen(false);

      // refresh topic info
      const tRes = await fetch(`${API_BASE}/topics/list`);
      const tJson = await tRes.json();
      const found = Array.isArray(tJson) ? tJson.find((t) => t.id === topicId) : null;
      setTopic(found);

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
    if (!window.confirm(`Open topic for all students for ${days} day(s)?`)) return;

    try {
      const res = await fetch(`${API_BASE}/topics/${topicId}/temporary-open-class`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days, createdBy: "teacher-ui" }),
      });

      if (!res.ok) throw new Error(await res.text());

      alert("Topic temporarily opened for class.");
      setScheduleModalOpen(false);

      // refresh topic info
      const tRes = await fetch(`${API_BASE}/topics/list`);
      const tJson = await tRes.json();
      const found = Array.isArray(tJson) ? tJson.find((t) => t.id === topicId) : null;
      setTopic(found);

      window.dispatchEvent(new Event("studentDataUpdated"));
      window.dispatchEvent(new Event("studentPathUpdated"));
    } catch (err) {
      console.error("tempOpenTopicFromModal error", err);
      alert("Failed to open temporarily.");
    }
  }

  const pageWrap = {
    minHeight: "100vh",
    background: "#f6f8fc",
    padding: "24px 12px",
  };

  const shell = {
    maxWidth: 1100,
    margin: "0 auto",
    width: "100%",
    minWidth: 0,          // ✅ important inside flex parents
    boxSizing: "border-box",
  };

  const headerCard = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
  };

  const topBar = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 14,
  };

  const titleRow = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  };

  const leftTitle = { minWidth: 260 };

  const actionsRow = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 16,
  };

  const actionGroup = {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  };

  const pillTabs = {
    display: "flex",
    gap: 8,
    padding: 6,
    borderRadius: 999,
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
  };

  const tabBtn = (active, tone = "blue") => ({
    padding: "10px 14px",
    borderRadius: 999,
    border: active ? "1px solid transparent" : "1px solid transparent",
    background: active
      ? (tone === "teal" ? "#0f766e" : "#2563eb")
      : "transparent",
    color: active ? "#fff" : "#0f172a",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: active ? "0 10px 18px rgba(2, 6, 23, 0.18)" : "none",
  });

  const backBtn = {
    background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
    color: "#fff",
    border: "none",
    padding: "10px 14px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 700,
    boxShadow: "0 10px 18px rgba(2, 6, 23, 0.20)",
  };

  const contentArea = {
    maxWidth: 980,
    margin: "18px auto 0",
  };

  const sectionCard = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 10px 22px rgba(15, 23, 42, 0.05)",
    marginBottom: 14,
  };

  const textareaStyle = {
    width: "100%",
    boxSizing: "border-box",
    resize: "vertical",          // ✅ prevents sideways overflow
    maxWidth: "100%",            // ✅ never exceed container
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    padding: 12,
    outline: "none",
  };

  // ---------------- Render ----------------
  if (!topic) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{ ...pageWrap, overflowX: "hidden", boxSizing: "border-box" }}>
      <div style={{ ...shell, width: "100%", minWidth: 0 }}>
        {/* Top header card */}
        <div style={headerCard}>
          <div
            style={{
              background: "#ffffff",
              borderRadius: 18,
              padding: 18,
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
              border: "1px solid #eef2ff",
              marginBottom: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/teacher/content")}
                style={{
                  background: "#0f172a",
                  color: "#fff",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: 999,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 6px 16px rgba(15, 23, 42, 0.18)",
                }}
              >
                ← Back
              </button>

              {/* Tabs */}
              <div
                style={{
                  background: "#f1f5f9",
                  padding: 6,
                  borderRadius: 999,
                  display: "flex",
                  gap: 6,
                  border: "1px solid #e2e8f0",
                }}
              >
                {[
                  { key: "content", label: "Content", activeBg: "#2563eb", activeColor: "#fff" },
                  { key: "assessment", label: "Assessment", activeBg: "#334155", activeColor: "#fff" },
                  { key: "practice", label: "Practice", activeBg: "#0f766e", activeColor: "#fff" },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: 999,
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 700,
                      background: tab === t.key ? t.activeBg : "transparent",
                      color: tab === t.key ? t.activeColor : "#0f172a",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontSize: 30, letterSpacing: "-0.02em" }}>{topic.name}</h1>

              {topic.term && (
                <span
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  {topic.term} Grading
                </span>
              )}
            </div>

            <p style={{ color: "#475569", marginTop: 10, marginBottom: 0, fontSize: 15, lineHeight: 1.6 }}>
              {topic.description}
            </p>
          </div>

          {/* Header action row */}
          <div style={{ ...actionRow, justifyContent: "space-between" }}>
            {/* LEFT actions: Add Resource first, then Schedule */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {tab === "content" && (
                <button onClick={() => setShowAddModal(true)} style={{ ...actionBtn, background: "#2563eb" }}>
                  ➕ Add Resource
                </button>
              )}

              <button onClick={openScheduleModal} style={{ ...actionBtn, background: "#06b6d4" }}>
                🗓 Manage Schedule
              </button>

              {tab === "assessment" && (
                <>
                  <button onClick={addQuestion} style={{ ...actionBtn, background: "#16a34a" }}>
                    + Add question
                  </button>
                  <button
                    onClick={saveAssessment}
                    disabled={savingAssessment}
                    style={{ ...actionBtn, background: "#2563eb" }}
                  >
                    Save Assessment
                  </button>
                </>
              )}

              {tab === "practice" && (
                <>
                  <button onClick={addPracticeQuestion} style={{ ...actionBtn, background: "#0f766e" }}>
                    + Add practice question
                  </button>
                  <button
                    onClick={savePractice}
                    disabled={savingPractice}
                    style={{ ...actionBtn, background: "#0f766e" }}
                  >
                    Save Practice
                  </button>
                </>
              )}
            </div>

            {/* RIGHT action: Delete Topic replaces the old Add Resource position */}
            <button onClick={deleteTopic} style={{ ...actionBtn, background: "#ef4444" }}>
              🗑 Delete Topic
            </button>
          </div>
        </div>

              {/* Add Resource Modal */}
        {showAddModal && (
          <div style={modalOverlay}>
            <div style={modalCard}>
              <h3 style={{ marginTop: 0 }}>Add Resource — {topic.name}</h3>

              {modalLinks.map((it, i) => (
                <div
                  key={i}
                  style={{
                    marginTop: 12,
                    background: "#fff",
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input
                      placeholder={`Resource link #${i + 1}`}
                      value={it.link}
                      onChange={(e) => updateModalLink(i, { ...it, link: e.target.value })}
                      style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
                    />
                    <select
                      value={it.type}
                      onChange={(e) => updateModalLink(i, { ...it, type: e.target.value })}
                      style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
                    >
                      <option value="video">Video</option>
                      <option value="presentation">Presentation</option>
                      <option value="pdf">PDF</option>
                      <option value="link">Link</option>
                    </select>
                    {modalLinks.length > 1 && (
                      <button
                        onClick={() => removeModalLink(i)}
                        style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "8px 10px" }}
                      >
                        ✖
                      </button>
                    )}
                  </div>

                  <textarea
                    placeholder="Short description..."
                    value={it.description}
                    onChange={(e) => updateModalLink(i, { ...it, description: e.target.value })}
                    style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #d1d5db", resize: "vertical" }}
                  />
                </div>
              ))}

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button onClick={addModalLink} style={{ ...actionBtn, background: "#2563eb" }}>
                  ➕ Add Another
                </button>
                <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
                  <button onClick={() => setShowAddModal(false)} style={{ ...actionBtn, background: "#9ca3af" }}>
                    Cancel
                  </button>
                  <button onClick={handleAddContentSave} style={{ ...actionBtn, background: "#16a34a" }}>
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Modal */}
        {scheduleModalOpen && (
          <div style={modalOverlay}>
            <div style={modalCard}>
              <h3 style={{ marginTop: 0 }}>Schedule — {topic.name}</h3>

              <label style={labelStyle}>Open at (local)</label>
              <input type="datetime-local" value={scheduleOpenAt} onChange={(e) => setScheduleOpenAt(e.target.value)} style={inputStyle} />

              <label style={labelStyle}>Close at (local)</label>
              <input type="datetime-local" value={scheduleCloseAt} onChange={(e) => setScheduleCloseAt(e.target.value)} style={inputStyle} />

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                <input id="sched-manual" type="checkbox" checked={scheduleManualLock} onChange={(e) => setScheduleManualLock(e.target.checked)} />
                <label htmlFor="sched-manual" style={{ fontWeight: 700, color: "#111827" }}>Manual lock</label>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                <button onClick={() => setScheduleModalOpen(false)} style={{ ...actionBtn, background: "#9ca3af" }}>
                  Cancel
                </button>
                <button onClick={saveScheduleModal} disabled={savingScheduleModal} style={{ ...actionBtn, background: "#2563eb", opacity: savingScheduleModal ? 0.75 : 1 }}>
                  {savingScheduleModal ? "Saving..." : "Save Schedule"}
                </button>

                <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
                  <button onClick={() => tempOpenTopicFromModal(1)} style={{ ...actionBtn, background: "#06b6d4" }}>
                    Open 1 day
                  </button>
                  <button onClick={() => tempOpenTopicFromModal(3)} style={{ ...actionBtn, background: "#0ea5a4" }}>
                    Open 3 days
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Centered main content area (tabs content) */}
        <div style={{ maxWidth: 980, margin: "0 auto", width: "100%", minWidth: 0 }}>

          {/* CONTENT TAB (unchanged) */}
          {tab === "content" && (
            <>
              <div style={contentGroup}>

                {/* (optional) small section title */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#0f172a" }}>Content Area</h2>
                  <span style={{ color: "#64748b", fontSize: 13 }}>Discussion + materials</span>
                </div>
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: 18,
                    padding: 18,
                    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
                    border: "1px solid #e2e8f0",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 18 }}>Student Notes / Discussion</h3>
                      <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                        This will appear in the student Content view for this topic.
                      </div>
                    </div>

                    <button
                      onClick={saveDiscussion}
                      disabled={savingDiscussion}
                      style={{
                        background: "#2563eb",
                        color: "#fff",
                        border: "none",
                        padding: "10px 14px",
                        borderRadius: 12,
                        cursor: "pointer",
                        fontWeight: 800,
                        opacity: savingDiscussion ? 0.7 : 1,
                      }}
                    >
                      {savingDiscussion ? "Saving..." : "Save Discussion"}
                    </button>
                  </div>

                  <textarea
                    value={discussion}
                    onChange={(e) => setDiscussion(e.target.value)}
                    placeholder="Write your discussion points here..."
                    style={{
                      width: "100%",
                      maxWidth: "100%",
                      boxSizing: "border-box",
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid #cbd5e1",
                      minHeight: 120,
                      resize: "vertical",
                      outline: "none",
                      lineHeight: 1.6,
                    }}
                  />
                </div>

                {contents.length === 0 ? (
                  <p style={{ margin: 0, color: "#64748b" }}>No materials yet.</p>
                ) : (
                  contents.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        background: "#ffffff",
                        borderRadius: 18,
                        padding: 18,
                        margin: "0 auto 16px auto",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
                        width: "100%",
                        maxWidth: 980,
                        boxSizing: "border-box",
                        minWidth: 0,
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
                                width: "100%",
                                maxWidth: "100%",
                                paddingBottom: "56.25%",
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
            </>
          )}

          {/* ASSESSMENT TAB */}
          {tab === "assessment" && (
            <div style={{ maxWidth: 900 }}>
              {assessmentLoading ? (
                <div>Loading assessment...</div>
              ) : (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontWeight: 600 }}>Title</label>
                    <input
                      value={assessment?.title || ""}
                      onChange={(e) => setAssessment((a) => ({ ...a, title: e.target.value }))}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc", marginBottom: 8 }}
                    />

                    <label style={{ display: "block", fontWeight: 600 }}>Instructions</label>
                    <textarea
                      value={assessment?.instructions || ""}
                      onChange={(e) => setAssessment((a) => ({ ...a, instructions: e.target.value }))}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc", marginBottom: 8, minHeight: 80 }}
                    />

                    <label style={{ display: "block", fontWeight: 600 }}>Passing score (%)</label>
                    <input
                      type="number"
                      value={assessment?.passing_score ?? 70}
                      onChange={(e) => setAssessment((a) => ({ ...a, passing_score: Number(e.target.value) }))}
                      style={{ width: 140, padding: 8, borderRadius: 6, border: "1px solid #ccc", marginBottom: 8 }}
                    />
                  </div>

                  <hr />

                  <div>
                    <h3>Questions</h3>
                    {(assessment?.questions || []).length === 0 && (
                      <div style={{ color: "#6b7280", marginBottom: 10 }}>No questions yet. Click “Add question”.</div>
                    )}

                    {(assessment?.questions || []).map((q, idx) => (
                      <div key={q.question_id} style={{ border: "1px solid #eef2ff", padding: 10, borderRadius: 8, marginBottom: 10 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                          <strong style={{ minWidth: 140 }}>{`Q${idx + 1} — ${q.type}`}</strong>
                          <select value={q.type} onChange={(e) => updateQuestion(idx, { type: e.target.value })} style={{ padding: 6, borderRadius: 6 }}>
                            <option value="multiple_choice">Multiple Choice</option>
                            <option value="numeric">Numeric</option>
                            <option value="short_answer">Short Answer</option>
                            <option value="ordering">Ordering</option>
                          </select>
                          <input
                            type="number"
                            value={q.points ?? 1}
                            onChange={(e) => updateQuestion(idx, { points: Number(e.target.value || 1) })}
                            style={{ width: 80, padding: 6, borderRadius: 6, marginLeft: "auto" }}
                            title="Points"
                          />
                        </div>

                        <input
                          placeholder="Question text"
                          value={q.question}
                          onChange={(e) => updateQuestion(idx, { question: e.target.value })}
                          style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc", marginBottom: 8 }}
                        />

                        {/* choices for multiple choice */}
                        {q.type === "multiple_choice" && (
                          <>
                            {(q.choices || []).map((c, ci) => (
                              <div key={ci} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                                <input value={c} onChange={(e) => {
                                  const nc = [...q.choices]; nc[ci] = e.target.value; updateQuestion(idx, { choices: nc });
                                }} style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #ccc" }} />
                                <button onClick={() => {
                                  const nc = (q.choices || []).filter((_, i) => i !== ci);
                                  updateQuestion(idx, { choices: nc });
                                }} style={{ background: "#ef4444", color: "#fff", borderRadius: 6, border: "none", padding: "6px 8px" }}>✖</button>
                              </div>
                            ))}
                            <div style={{ marginBottom: 8 }}>
                              <button onClick={() => updateQuestion(idx, { choices: [...(q.choices || []), ""] })} style={{ background: "#2563eb", color: "#fff", padding: "6px 8px", border: "none", borderRadius: 6 }}>+ Add choice</button>
                            </div>

                            <div>
                              <label style={{ display: "block", fontWeight: 600 }}>Correct answer (exact match)</label>
                              <input value={q.answer || ""} onChange={(e) => updateQuestion(idx, { answer: e.target.value })} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }} />
                            </div>
                          </>
                        )}

                        {/* ordering hint */}
                        {q.type === "ordering" && (
                          <>
                            <p style={{ color: "#6b7280", marginTop: 8 }}>For ordering questions, provide `correct_order` as a JSON array in the teacher UI (use choices to define items, then set correct_order to the correct array order).</p>
                            <label>Choices (items)</label>
                            {(q.choices || []).map((c, ci) => (
                              <input key={ci} value={c} onChange={(e) => {
                                const nc = [...q.choices]; nc[ci] = e.target.value; updateQuestion(idx, { choices: nc });
                              }} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc", marginBottom: 6 }} />
                            ))}
                            <div style={{ marginBottom: 8 }}>
                              <button onClick={() => updateQuestion(idx, { choices: [...(q.choices || []), ""] })} style={{ background: "#2563eb", color: "#fff", padding: "6px 8px", border: "none", borderRadius: 6 }}>+ Add item</button>
                            </div>

                            <label>Correct order (JSON array)</label>
                            <input value={JSON.stringify(q.correct_order || q.answer || [])} onChange={(e) => {
                              // allow typing JSON
                              try {
                                const parsed = JSON.parse(e.target.value);
                                updateQuestion(idx, { correct_order: parsed });
                              } catch (err) {
                                // keep as string until valid json - do nothing
                              }
                            }} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }} />
                          </>
                        )}

                        {q.type === "short_answer" && (
                          <>
                            <label style={{ display: "block", fontWeight: 600 }}>Answer (exact)</label>
                            <input value={q.answer || ""} onChange={(e) => updateQuestion(idx, { answer: e.target.value })} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }} />
                          </>
                        )}

                        {q.type === "numeric" && (
                          <>
                            <label style={{ display: "block", fontWeight: 600 }}>Numeric answer</label>
                            <input type="number" value={q.answer || ""} onChange={(e) => updateQuestion(idx, { answer: e.target.value })} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }} />
                          </>
                        )}

                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <button onClick={() => removeQuestion(idx)} style={{ background: "#ef4444", color: "#fff", border: "none", padding: "6px 8px", borderRadius: 6 }}>Remove</button>
                        </div>
                      </div>
                    ))}

                    <div style={{ marginTop: 10 }}>
                      <button onClick={addQuestion} style={{ background: "#16a34a", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 6 }}>+ Add question</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* PRACTICE TAB */}
          {tab === "practice" && (
            <div style={{ maxWidth: 900 }}>
              {practiceLoading ? (
                <div>Loading practice...</div>
              ) : !practice ? (
                <div>No practice configuration loaded.</div>
              ) : (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontWeight: 600 }}>Title</label>
                    <input
                      value={practice.title || ""}
                      onChange={(e) =>
                        setPractice((p) => ({ ...(p || {}), title: e.target.value }))
                      }
                      style={{
                        width: "100%",
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid #ccc",
                        marginBottom: 8,
                      }}
                    />

                    <label style={{ display: "block", fontWeight: 600 }}>
                      Instructions (shown before practice)
                    </label>
                    <textarea
                      value={practice.instructions || ""}
                      onChange={(e) =>
                        setPractice((p) => ({
                          ...(p || {}),
                          instructions: e.target.value,
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid #ccc",
                        marginBottom: 8,
                        minHeight: 80,
                      }}
                    />

                    <label style={{ display: "block", fontWeight: 600 }}>
                      Passing score (%) for a practice session
                    </label>
                    <input
                      type="number"
                      value={practice.passing_score ?? 70}
                      onChange={(e) =>
                        setPractice((p) => ({
                          ...(p || {}),
                          passing_score: Number(e.target.value),
                        }))
                      }
                      style={{
                        width: 160,
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid #ccc",
                        marginBottom: 8,
                      }}
                    />
                  </div>

                  <hr />

                  <div>
                    <h3>Practice Questions (bank)</h3>
                    {(practice.questions || []).length === 0 && (
                      <div style={{ color: "#6b7280", marginBottom: 10 }}>
                        No practice questions yet. Click “Add practice question”.
                      </div>
                    )}

                    {(practice.questions || []).map((q, idx) => (
                      <div
                        key={q.question_id || `p_${idx}`}
                        style={{
                          border: "1px solid #ecfeff",
                          padding: 10,
                          borderRadius: 8,
                          marginBottom: 10,
                          background: "#f9fafb",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            marginBottom: 8,
                          }}
                        >
                          <strong style={{ minWidth: 160 }}>{`P${idx + 1} — ${
                            q.type || "multiple_choice"
                          }`}</strong>
                          <select
                            value={q.type}
                            onChange={(e) =>
                              updatePracticeQuestion(idx, { type: e.target.value })
                            }
                            style={{ padding: 6, borderRadius: 6 }}
                          >
                            <option value="multiple_choice">Multiple Choice</option>
                            <option value="short_answer">Short Answer</option>
                            <option value="numeric">Numeric</option>
                            <option value="ordering">Ordering</option>
                          </select>
                          <input
                            type="number"
                            value={q.points ?? 1}
                            onChange={(e) =>
                              updatePracticeQuestion(idx, {
                                points: Number(e.target.value || 1),
                              })
                            }
                            style={{
                              width: 80,
                              padding: 6,
                              borderRadius: 6,
                              marginLeft: "auto",
                            }}
                            title="Points"
                          />
                        </div>

                        <input
                          placeholder="Question text"
                          value={q.question || ""}
                          onChange={(e) =>
                            updatePracticeQuestion(idx, { question: e.target.value })
                          }
                          style={{
                            width: "100%",
                            padding: 8,
                            borderRadius: 6,
                            border: "1px solid #ccc",
                            marginBottom: 8,
                          }}
                        />

                        {/* MCQ */}
                        {q.type === "multiple_choice" && (
                          <>
                            {(q.choices || []).map((c, ci) => (
                              <div
                                key={ci}
                                style={{
                                  display: "flex",
                                  gap: 8,
                                  marginBottom: 6,
                                }}
                              >
                                <input
                                  value={c}
                                  onChange={(e) => {
                                    const nc = [...(q.choices || [])];
                                    nc[ci] = e.target.value;
                                    updatePracticeQuestion(idx, { choices: nc });
                                  }}
                                  style={{
                                    flex: 1,
                                    padding: 8,
                                    borderRadius: 6,
                                    border: "1px solid #ccc",
                                  }}
                                />
                                <button
                                  onClick={() => {
                                    const nc = [...(q.choices || [])];
                                    nc.splice(ci, 1);
                                    updatePracticeQuestion(idx, { choices: nc });
                                  }}
                                  style={{
                                    background: "#ef4444",
                                    color: "#fff",
                                    borderRadius: 6,
                                    border: "none",
                                    padding: "6px 8px",
                                  }}
                                >
                                  ✖
                                </button>
                              </div>
                            ))}
                            <div style={{ marginBottom: 8 }}>
                              <button
                                onClick={() =>
                                  updatePracticeQuestion(idx, {
                                    choices: [...(q.choices || []), ""],
                                  })
                                }
                                style={{
                                  background: "#2563eb",
                                  color: "#fff",
                                  padding: "6px 8px",
                                  border: "none",
                                  borderRadius: 6,
                                }}
                              >
                                + Add choice
                              </button>
                            </div>

                            <div>
                              <label
                                style={{
                                  display: "block",
                                  fontWeight: 600,
                                }}
                              >
                                Correct answer (exact match)
                              </label>
                              <input
                                value={q.answer || ""}
                                onChange={(e) =>
                                  updatePracticeQuestion(idx, {
                                    answer: e.target.value,
                                  })
                                }
                                style={{
                                  width: "100%",
                                  padding: 8,
                                  borderRadius: 6,
                                  border: "1px solid #ccc",
                                }}
                              />
                            </div>
                          </>
                        )}

                        {/* Ordering */}
                        {q.type === "ordering" && (
                          <>
                            <p
                              style={{
                                color: "#6b7280",
                                marginTop: 8,
                                fontSize: 13,
                              }}
                            >
                              Provide items as choices, then set the correct order
                              as a JSON array.
                            </p>
                            {(q.choices || []).map((c, ci) => (
                              <input
                                key={ci}
                                value={c}
                                onChange={(e) => {
                                  const nc = [...(q.choices || [])];
                                  nc[ci] = e.target.value;
                                  updatePracticeQuestion(idx, { choices: nc });
                                }}
                                style={{
                                  width: "100%",
                                  padding: 8,
                                  borderRadius: 6,
                                  border: "1px solid #ccc",
                                  marginBottom: 6,
                                }}
                              />
                            ))}
                            <div style={{ marginBottom: 8 }}>
                              <button
                                onClick={() =>
                                  updatePracticeQuestion(idx, {
                                    choices: [...(q.choices || []), ""],
                                  })
                                }
                                style={{
                                  background: "#2563eb",
                                  color: "#fff",
                                  padding: "6px 8px",
                                  border: "none",
                                  borderRadius: 6,
                                }}
                              >
                                + Add item
                              </button>
                            </div>
                            <label>Correct order (JSON array)</label>
                            <input
                              value={JSON.stringify(
                                q.correct_order || q.answer || []
                              )}
                              onChange={(e) => {
                                try {
                                  const parsed = JSON.parse(e.target.value);
                                  updatePracticeQuestion(idx, {
                                    correct_order: parsed,
                                  });
                                } catch (err) {
                                  // ignore invalid JSON while typing
                                }
                              }}
                              style={{
                                width: "100%",
                                padding: 8,
                                borderRadius: 6,
                                border: "1px solid #ccc",
                              }}
                            />
                          </>
                        )}

                        {/* Short answer */}
                        {q.type === "short_answer" && (
                          <>
                            <label
                              style={{
                                display: "block",
                                fontWeight: 600,
                                marginTop: 6,
                              }}
                            >
                              Answer (exact)
                            </label>
                            <input
                              value={q.answer || ""}
                              onChange={(e) =>
                                updatePracticeQuestion(idx, {
                                  answer: e.target.value,
                                })
                              }
                              style={{
                                width: "100%",
                                padding: 8,
                                borderRadius: 6,
                                border: "1px solid #ccc",
                              }}
                            />
                          </>
                        )}

                        {/* Numeric */}
                        {q.type === "numeric" && (
                          <>
                            <label
                              style={{
                                display: "block",
                                fontWeight: 600,
                                marginTop: 6,
                              }}
                            >
                              Numeric answer
                            </label>
                            <input
                              type="number"
                              value={q.answer || ""}
                              onChange={(e) =>
                                updatePracticeQuestion(idx, {
                                  answer: e.target.value,
                                })
                              }
                              style={{
                                width: "200px",
                                padding: 8,
                                borderRadius: 6,
                                border: "1px solid #ccc",
                              }}
                            />
                          </>
                        )}

                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <button
                            onClick={() => removePracticeQuestion(idx)}
                            style={{
                              background: "#ef4444",
                              color: "#fff",
                              border: "none",
                              padding: "6px 8px",
                              borderRadius: 6,
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}

                    <div style={{ marginTop: 10 }}>
                      <button
                        onClick={addPracticeQuestion}
                        style={{
                          background: "#0f766e",
                          color: "#fff",
                          border: "none",
                          padding: "8px 12px",
                          borderRadius: 6,
                        }}
                      >
                        + Add practice question
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

const headerCard = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
  marginBottom: 16,
};

const contentGroup = {
  marginTop: 18,
  padding: 14,
  borderRadius: 18,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
};

const backBtn = {
  background: "#111827",
  color: "#fff",
  border: "none",
  padding: "10px 12px",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 700,
  letterSpacing: 0.2,
  boxShadow: "0 8px 18px rgba(17,24,39,0.18)",
};

const pill = {
  padding: "6px 10px",
  borderRadius: 999,
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 13,
  fontWeight: 800,
};

const tabsWrap = {
  display: "inline-flex",
  background: "#f3f4f6",
  padding: 6,
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  gap: 6,
};

const tabBtn = {
  border: "none",
  padding: "10px 14px",
  borderRadius: 999,
  cursor: "pointer",
  background: "transparent",
  fontWeight: 800,
  color: "#374151",
};

const tabActiveBlue = {
  background: "#2563eb",
  color: "#fff",
  boxShadow: "0 8px 16px rgba(37,99,235,0.22)",
};

const tabActiveTeal = {
  background: "#0f766e",
  color: "#fff",
  boxShadow: "0 8px 16px rgba(15,118,110,0.22)",
};

const actionRow = {
  marginTop: 14,
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};

const actionBtn = {
  border: "none",
  color: "#fff",
  padding: "10px 12px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 800,
  boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
};

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const modalCard = {
  background: "#fff",
  padding: 18,
  borderRadius: 16,
  width: "720px",
  maxWidth: "92vw",
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
};

const labelStyle = { display: "block", fontWeight: 800, marginTop: 10, marginBottom: 6, color: "#111827" };
const inputStyle = { width: "100%", padding: 10, borderRadius: 10, border: "1px solid #d1d5db", boxSizing: "border-box" };
