// frontend/src/teacher/CompactAssessmentModal.jsx
import { useEffect, useState } from "react";

const API_BASE = "https://page-jirk.onrender.com";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999
};

const cardStyle = {
  background: "#fff",
  borderRadius: 12,
  width: "900px",
  maxHeight: "90vh",
  overflowY: "auto",
  padding: 20,
  boxSizing: "border-box",
  boxShadow: "0 10px 30px rgba(0,0,0,0.12)"
};

const inputStyle = { width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc", boxSizing: "border-box" };

export default function CompactAssessmentModal({ topicId, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState({
    topic_id: topicId,
    title: "",
    instructions: "",
    passing_score: 70,
    questions: []
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/assessments/${topicId}`);
        if (res.ok) {
          const j = await res.json();
          if (!mounted) return;
          setAssessment({
            topic_id: topicId,
            title: j.title || "",
            instructions: j.instructions || "",
            passing_score: j.passing_score ?? 70,
            questions: Array.isArray(j.questions) ? j.questions : []
          });
        } else {
          if (mounted) setAssessment(a => ({ ...a, topic_id: topicId, passing_score: 70 }));
        }
      } catch (err) {
        console.error("load assessment", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [topicId]);

  function addQuestion() {
    setAssessment(a => ({
      ...a,
      questions: [
        ...a.questions,
        { question_id: `q_${Date.now()}`, type: "multiple_choice", question: "", choices: ["Option A", "Option B"], answer: "", points: 1 }
      ]
    }));
  }

  function updateQuestion(i, patch) {
    setAssessment(a => {
      const q = [...a.questions];
      q[i] = { ...q[i], ...patch };
      return { ...a, questions: q };
    });
  }

  function removeQuestion(i) {
    setAssessment(a => {
      const q = [...a.questions];
      q.splice(i, 1);
      return { ...a, questions: q };
    });
  }

  async function save() {
    if (!assessment.title || !assessment.title.trim()) { alert("Please add a title"); return; }
    setSaving(true);
    try {
      const payload = {
        topic_id: assessment.topic_id,
        title: assessment.title,
        instructions: assessment.instructions,
        passing_score: Number(assessment.passing_score) || 70,
        questions: (assessment.questions || []).map(q => ({
          question_id: q.question_id,
          type: q.type,
          question: q.question,
          choices: q.choices || [],
          answer: q.answer,
          points: q.points ?? 1,
          correct_order: q.correct_order || null
        }))
      };

      const res = await fetch(`${API_BASE}/assessments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        console.error("save failed", json);
        alert(json.error || "Failed to save assessment");
      } else {
        alert("Assessment saved");
        if (onSaved) await onSaved();
        onClose();
      }
    } catch (err) {
      console.error("save error", err);
      alert("Failed to save assessment");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading assessment...</div>;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ margin: 0, flex: 1 }}>Manage Assessment — {topicId}</h3>
          <button onClick={onClose} style={{ background: "#ef4444", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 8 }}>✖</button>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "block", fontWeight: 600 }}>Title</label>
          <input value={assessment.title} onChange={e => setAssessment({ ...assessment, title: e.target.value })} style={inputStyle} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "block", fontWeight: 600 }}>Instructions</label>
          <textarea value={assessment.instructions} onChange={e => setAssessment({ ...assessment, instructions: e.target.value })} rows={2} style={{ ...inputStyle, height: 80 }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontWeight: 600 }}>Passing score (%)</label>
          <input type="number" min={0} max={100} value={assessment.passing_score || 70} onChange={e => setAssessment({ ...assessment, passing_score: Number(e.target.value) })} style={{ width: 120, padding: 8, borderRadius: 6 }} />
        </div>

        <div>
          <h4 style={{ marginTop: 0 }}>Questions</h4>
          {assessment.questions.length === 0 && <div style={{ color: "#6b7280" }}>No questions yet.</div>}
          {assessment.questions.map((q, i) => (
            <div key={q.question_id} style={{ border: "1px solid #eef2ff", padding: 10, borderRadius: 8, marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <strong>Q{i + 1}</strong>
                <select value={q.type} onChange={e => updateQuestion(i, { type: e.target.value })}>
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="short_answer">Short Answer</option>
                  <option value="numeric">Numeric</option>
                  <option value="ordering">Ordering</option>
                </select>
                <input value={q.points ?? 1} onChange={e => updateQuestion(i, { points: Number(e.target.value) || 1 })} style={{ width: 72 }} />
                <div style={{ marginLeft: "auto" }}>
                  <button onClick={() => removeQuestion(i)} style={{ background: "#ef4444", color: "#fff", border: "none", padding: "6px 8px", borderRadius: 6 }}>Delete</button>
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <input placeholder="Question text" value={q.question} onChange={e => updateQuestion(i, { question: e.target.value })} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }} />
              </div>

              {q.type === "multiple_choice" && (
                <div style={{ marginTop: 8 }}>
                  {(q.choices || []).map((c, ci) => (
                    <div key={ci} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                      <input value={c} onChange={e => {
                        const nc = [...(q.choices || [])]; nc[ci] = e.target.value; updateQuestion(i, { choices: nc });
                      }} style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #ccc" }} />
                      <button onClick={() => {
                        const nc = [...(q.choices || [])]; nc.splice(ci, 1); updateQuestion(i, { choices: nc, answer: nc.includes(q.answer) ? q.answer : nc[0] || "" });
                      }} style={{ background: "#ef4444", color: "#fff", border: "none", padding: "6px 8px", borderRadius: 6 }}>✖</button>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => updateQuestion(i, { choices: [...(q.choices || []), `Option ${(q.choices || []).length + 1}`] })} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "6px 8px", borderRadius: 6 }}>+ Choice</button>
                    <select value={q.answer} onChange={e => updateQuestion(i, { answer: e.target.value })} style={{ marginLeft: "auto" }}>
                      {(q.choices || []).map((c, ci) => <option key={ci} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {q.type === "short_answer" && (
                <div style={{ marginTop: 8 }}>
                  <label style={{ fontSize: 13, color: "#6b7280" }}>Expected answer (optional)</label>
                  <input value={q.answer || ""} onChange={e => updateQuestion(i, { answer: e.target.value })} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }} />
                </div>
              )}

              {q.type === "numeric" && (
                <div style={{ marginTop: 8 }}>
                  <label style={{ fontSize: 13, color: "#6b7280" }}>Correct numeric answer</label>
                  <input type="number" value={q.answer ?? ""} onChange={e => updateQuestion(i, { answer: e.target.value })} style={{ width: 160, padding: 8, borderRadius: 6, border: "1px solid #ccc" }} />
                </div>
              )}

              {q.type === "ordering" && (
                <div style={{ marginTop: 8 }}>
                  <label style={{ fontSize: 13, color: "#6b7280" }}>Correct order (comma separated)</label>
                  <input value={(q.correct_order || []).join(", ")} onChange={e => updateQuestion(i, { correct_order: e.target.value.split(",").map(s => s.trim()) })} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }} />
                </div>
              )}
            </div>
          ))}
          <div style={{ marginTop: 8 }}>
            <button onClick={addQuestion} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 8 }}>+ Add question</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <button onClick={onClose} style={{ background: "#ddd", border: "none", padding: "8px 12px", borderRadius: 8 }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ background: "#16a34a", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 8 }}>{saving ? "Saving..." : "Save Assessment"}</button>
        </div>
      </div>
    </div>
  );
}
