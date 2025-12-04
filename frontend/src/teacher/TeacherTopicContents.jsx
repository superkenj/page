// frontend/src/teacher/TeacherTopicContents.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "https://page-jirk.onrender.com";

export default function TeacherTopicContents() {
  const { topicId } = useParams();
  const navigate = useNavigate();

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

  // --- schedule UI state
  const [openAtInput, setOpenAtInput] = useState("");
  const [closeAtInput, setCloseAtInput] = useState("");
  const [manualLock, setManualLock] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

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
        const cJson = await cRes.json();
        setContents(cJson || []);

        if (found) {
          setOpenAtInput(found.open_at ? found.open_at.substring(0,16) : ""); 
          setCloseAtInput(found.close_at ? found.close_at.substring(0,16) : "");
          setManualLock(!!found.manual_lock);
        }
      } catch (err) {
        console.error("loadData error", err);
      }
    }
    loadData();
  }, [topicId]);

    // Save schedule to backend
  async function saveSchedule() {
    setSavingSchedule(true);
    try {
      // convert from local datetime-local string to UTC ISO (assume the UI value is local)
      // For simplicity we send the raw ISO-like string and let the server treat it as UTC ISO-ish.
      const payload = {
        open_at: openAtInput ? new Date(openAtInput).toISOString() : null,
        close_at: closeAtInput ? new Date(closeAtInput).toISOString() : null,
        manual_lock: !!manualLock
      };

      const res = await fetch(`${API_BASE}/topics/${topicId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to save schedule");
      }

      alert("Schedule saved.");
      // refresh topic data
      const tRes = await fetch(`${API_BASE}/topics/list`);
      const tJson = await tRes.json();
      const found = Array.isArray(tJson) ? tJson.find((t) => t.id === topicId) : null;
      setTopic(found);
    } catch (err) {
      console.error("saveSchedule error", err);
      alert("Failed to save schedule.");
    } finally {
      setSavingSchedule(false);
    }
  }

  // Temporarily open topic for whole class (default 3 days)
  async function tempOpenClass(days = 3) {
    if (!window.confirm(`Open this topic for all students for ${days} day(s)?`)) return;
    try {
      const res = await fetch(`${API_BASE}/topics/${topicId}/temporary-open-class`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days, createdBy: "teacher-ui" })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to open temporarily for class");
      }
      alert("Topic temporarily opened for class.");
    } catch (err) {
      console.error("tempOpenClass error", err);
      alert("Failed to open temporarily.");
    }
  }

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
      }
    } catch (err) {
      console.error("saveAssessment error", err);
      alert("Failed to save assessment.");
    } finally {
      setSavingAssessment(false);
    }
  }

  // ---------------- Render ----------------
  if (!topic) return <div style={{ padding: 20 }}>Loading...</div>;

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

      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>{topic.name}</h1>

        {/* Tab switcher */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={() => setTab("content")}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: tab === "content" ? "2px solid #2563eb" : "1px solid #e5e7eb",
              background: tab === "content" ? "#eef2ff" : "#fff",
              cursor: "pointer"
            }}
          >
            Content
          </button>
          <button
            onClick={() => setTab("assessment")}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: tab === "assessment" ? "2px solid #2563eb" : "1px solid #e5e7eb",
              background: tab === "assessment" ? "#eef2ff" : "#fff",
              cursor: "pointer"
            }}
          >
            Assessment
          </button>
        </div>
      </div>

      {/* Schedule controls (NEW) */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <div>
          <label style={{ display: "block", fontWeight: 600 }}>Open at (local)</label>
          <input
            type="datetime-local"
            value={openAtInput}
            onChange={(e) => setOpenAtInput(e.target.value)}
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontWeight: 600 }}>Close at (local)</label>
          <input
            type="datetime-local"
            value={closeAtInput}
            onChange={(e) => setCloseAtInput(e.target.value)}
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <label style={{ fontWeight: 600 }}>Manual lock</label>
          <input type="checkbox" checked={manualLock} onChange={(e) => setManualLock(e.target.checked)} />
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={() => saveSchedule()} disabled={savingSchedule} style={{ background: "#2563eb", color: "#fff", padding: "8px 12px", borderRadius: 6, border: "none" }}>
            {savingSchedule ? "Saving..." : "Save Schedule"}
          </button>
          <button onClick={() => tempOpenClass(3)} style={{ background: "#06b6d4", color: "#fff", padding: "8px 12px", borderRadius: 6, border: "none" }}>
            Temporarily open for class (3 days)
          </button>
        </div>
      </div>

      <p style={{ color: "#555", marginBottom: 18 }}>{topic.description}</p>

      {/* CONTENT TAB (unchanged) */}
      {tab === "content" && (
        <>
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
                        <option value="short_answer">Short Answer</option>
                        <option value="numeric">Numeric</option>
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

              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <button onClick={() => setTab("content")} style={{ background: "#ddd", padding: "8px 12px", borderRadius: 6 }}>Back to Content</button>
                <button onClick={saveAssessment} disabled={savingAssessment} style={{ background: "#2563eb", color: "#fff", padding: "8px 12px", borderRadius: 6 }}>
                  {savingAssessment ? "Saving..." : "Save Assessment"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
