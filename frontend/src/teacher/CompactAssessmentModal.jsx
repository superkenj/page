// CompactAssessmentModal.jsx (inline or import)
import { useState, useEffect } from "react";

const API_BASE = "https://page-jirk.onrender.com";

export default function CompactAssessmentModal({ topicId, onClose, refresh }) {
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState({ topic_id: topicId, title: "", instructions: "", passing_score: 70, questions: [] });

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/assessments/${topicId}`);
        if (res.ok) {
          const j = await res.json();
          if (mounted) setAssessment(j);
        } else {
          setAssessment(a => ({ ...a, topic_id: topicId, passing_score: 70 }));
        }
      } catch (err) {
        console.error("load assessment", err);
      } finally { if (mounted) setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, [topicId]);

  function addQuestion() {
    setAssessment(a => ({ ...a, questions: [...a.questions, { question_id: `q${Date.now()}`, type: "multiple_choice", question: "", choices: ["", ""], answer: "", points: 1 }] }));
  }
  function updateQuestion(idx, patch) {
    setAssessment(a => { const q = [...a.questions]; q[idx] = { ...q[idx], ...patch }; return { ...a, questions: q }; });
  }
  function removeQuestion(idx) {
    setAssessment(a => { const q = [...a.questions]; q.splice(idx,1); return { ...a, questions: q }; });
  }

  async function save() {
    try {
      // validation
      if (!assessment.title) { alert("Add a title"); return; }
      await fetch(`${API_BASE}/assessments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assessment),
      });
      alert("Saved");
      refresh && refresh();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save");
    }
  }

  if (loading) return <div style={{padding:20}}>Loading assessment...</div>;

  return (
    <div style={{ ...modalOverlay }}>
      <div style={{ ...modalCard, width: 720 }}>
        <h3>Assessment for: {topicId}</h3>
        <label>Title</label>
        <input value={assessment.title} onChange={e => setAssessment({...assessment, title: e.target.value})} style={inputStyle} />

        <label>Instructions</label>
        <textarea value={assessment.instructions} onChange={e => setAssessment({...assessment, instructions: e.target.value})} style={{...inputStyle, height:80}} />

        <label>Passing score (%)</label>
        <input type="number" value={assessment.passing_score || 70} onChange={e => setAssessment({...assessment, passing_score: Number(e.target.value)})} style={inputStyle} />

        <hr />
        <div>
          <h4>Questions</h4>
          {assessment.questions.map((q, idx) => (
            <div key={q.question_id} style={{border:"1px solid #eee", padding:8, marginBottom:8, borderRadius:8}}>
              <select value={q.type} onChange={e => updateQuestion(idx, { type: e.target.value })}>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="short_answer">Short Answer</option>
                <option value="ordering">Ordering</option>
                <option value="numeric">Numeric</option>
              </select>
              <input placeholder="Question" value={q.question} onChange={e=> updateQuestion(idx, { question: e.target.value })} style={{...inputStyle, marginTop:8}} />
              {q.type === "multiple_choice" && (
                <>
                  {q.choices.map((c, ci)=>(
                    <div key={ci} style={{display:"flex", gap:8, marginTop:6}}>
                      <input value={c} onChange={e=> {
                        const nc = [...q.choices]; nc[ci] = e.target.value; updateQuestion(idx, { choices: nc });
                      }} style={{flex:1, padding:6}} />
                      <button onClick={()=> {
                        const nc = q.choices.filter((_,i)=>i!==ci);
                        updateQuestion(idx, { choices: nc });
                      }}>✖</button>
                    </div>
                  ))}
                  <button onClick={()=> updateQuestion(idx, { choices: [...q.choices, ""] })}>+ Choice</button>
                  <div style={{marginTop:6}}>
                    <label>Correct answer (exact)</label>
                    <input value={q.answer} onChange={e => updateQuestion(idx, { answer: e.target.value })} style={inputStyle} />
                  </div>
                </>
              )}

              <div style={{marginTop:8, display:"flex", gap:8}}>
                <button onClick={()=> removeQuestion(idx)} style={{background:"#ef4444", color:"#fff"}}>Remove</button>
              </div>
            </div>
          ))}
          <button onClick={addQuestion} style={{background:"#2563eb", color:"#fff", padding:"8px 10px", borderRadius:6}}>+ Add question</button>
        </div>

        <div style={{display:"flex", gap:8, justifyContent:"flex-end", marginTop:12}}>
          <button onClick={onClose} style={{background:"#ddd", padding:"8px 12px", borderRadius:6}}>Cancel</button>
          <button onClick={save} style={{background:"#16a34a", color:"#fff", padding:"8px 12px", borderRadius:6}}>Save Assessment</button>
        </div>
      </div>
    </div>
  );
}
