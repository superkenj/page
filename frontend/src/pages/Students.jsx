// frontend/src/pages/Students.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000";

function Students() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ id: "", name: "", score: "", final: "" });
  const [editing, setEditing] = useState(false);
  const [currentPath, setCurrentPath] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recommendLoading, setRecommendLoading] = useState({}); // { studentId: bool }
  const [filter, setFilter] = useState("all"); // all | pass | fail
  const [query, setQuery] = useState("");

  useEffect(() => { fetchStudents(); }, []);

  async function fetchStudents() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/students/list`);
      if (!res.ok) {
        const err = await res.json().catch(()=>({error: "unknown"}));
        throw new Error(err.error || "Failed to load students");
      }
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      console.error("fetchStudents error:", err);
      alert("Could not load students: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function setField(k, v) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function saveStudent(e) {
    e.preventDefault();
    if (!form.id || !form.name || form.score === "" || form.final === "") {
      alert("Fill all fields");
      return;
    }
    if (Number(form.score) > Number(form.final)) {
      alert("Score cannot exceed Final");
      return;
    }
    const payload = {
      name: form.name,
      score: Number(form.score),
      final: Number(form.final),
      scores: { general: Number(form.score) },
      finals: { general: Number(form.final) }
    };
    try {
      const res = await fetch(`${API_BASE}/students/${form.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({error:"unknown"}));
        throw new Error(err.error || "Failed to save");
      }
      setForm({ id: "", name: "", score: "", final: "" });
      setEditing(false);
      await fetchStudents();
    } catch (err) {
      console.error("saveStudent error:", err);
      alert("Could not save student: " + err.message);
    }
  }

  function startEdit(s) {
    setEditing(true);
    setForm({ id: s.id, name: s.name, score: s.score ?? "", final: s.final ?? "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeStudent(id) {
    if (!confirm(`Delete ${id}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/students/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(()=>({error:"unknown"}));
        throw new Error(err.error || "Delete failed");
      }
      await fetchStudents();
    } catch (err) {
      console.error("removeStudent error:", err);
      alert("Could not delete student: " + err.message);
    }
  }

  // Navigate to StudentPath page (graph + full UI)
  function openStudentPath(studentId) {
    navigate(`/students/${studentId}/path`);
  }

  // Quick inline recommendation (keeps current behavior)
  async function getRecommendationInline(studentId) {
    setRecommendLoading(prev => ({ ...prev, [studentId]: true }));
    try {
      const res = await fetch(`${API_BASE}/students/${studentId}/path`);
      if (!res.ok) {
        const err = await res.json().catch(()=>({error:"unknown"}));
        throw new Error(err.error || "Failed to get recommendation");
      }
      const data = await res.json();
      setCurrentPath({ studentId, recommended: data.recommended || [], mastered: data.mastered || [] });
      // scroll to panel
      setTimeout(()=> document.getElementById("recommend-panel")?.scrollIntoView({ behavior: "smooth" }), 120);
    } catch (err) {
      console.error("getRecommendationInline error:", err);
      alert("Recommendation error: " + err.message);
    } finally {
      setRecommendLoading(prev => ({ ...prev, [studentId]: false }));
    }
  }

  async function markAsMastered(studentId, topicId) {
    try {
      const res = await fetch(`${API_BASE}/students/${studentId}/mastered`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics: [topicId] })
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({error:"unknown"}));
        throw new Error(err.error || "Failed to mark mastered");
      }
      // Refresh students list and recommendation panel
      await fetchStudents();
      // refresh recommendation for student inline if opened
      if (currentPath && currentPath.studentId === studentId) {
        await getRecommendationInline(studentId);
      }
    } catch (err) {
      console.error("markAsMastered error:", err);
      alert("Could not mark mastered: " + err.message);
    }
  }

  // Derived & filter
  const filtered = students.filter(s => {
    if (!s) return false;
    const q = query.trim().toLowerCase();
    if (q && !(s.id?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q))) return false;
    if (filter === "pass") return s.status === "PASS";
    if (filter === "fail") return s.status === "FAIL";
    return true;
  });

  const totalStudents = students.length;
  const totalPass = students.filter(s => s.status === "PASS").length;
  const totalFail = totalStudents - totalPass;

  return (
    <div style={{ padding: 20 }}>
      <h1>Students</h1>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <div style={{ background: "#fff", padding: 12, borderRadius: 8, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 14, color: "#666" }}>Total</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{totalStudents}</div>
        </div>
        <div style={{ background: "#fff", padding: 12, borderRadius: 8, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 14, color: "#666" }}>Pass</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#16a34a" }}>{totalPass}</div>
        </div>
        <div style={{ background: "#fff", padding: 12, borderRadius: 8, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 14, color: "#666" }}>Fail</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#dc2626" }}>{totalFail}</div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <input
            placeholder="Search id or name"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #ddd" }}
          />
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: "8px", borderRadius: 6 }}>
            <option value="all">All</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
          </select>
        </div>
      </div>

      <form onSubmit={saveStudent} style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input placeholder="Student ID" value={form.id} onChange={e=>setField("id", e.target.value)} />
        <input placeholder="Name" value={form.name} onChange={e=>setField("name", e.target.value)} />
        <input type="number" placeholder="Score" value={form.score} onChange={e=>setField("score", e.target.value)} />
        <input type="number" placeholder="Final" value={form.final} onChange={e=>setField("final", e.target.value)} />
        <button type="submit" style={{ padding: "8px 12px" }}>{editing ? "Update" : "Add"}</button>
        <button type="button" onClick={() => { setEditing(false); setForm({ id: "", name: "", score: "", final: "" }); }} style={{ padding: "8px 12px" }}>
          Reset
        </button>
      </form>

      {loading ? <div>Loading students...</div> : (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8 }}>
          <thead>
            <tr>
              <th style={{textAlign:"left", padding:8}}>ID</th>
              <th style={{textAlign:"left", padding:8}}>Name</th>
              <th style={{textAlign:"right", padding:8}}>Score</th>
              <th style={{textAlign:"right", padding:8}}>Final</th>
              <th style={{textAlign:"center", padding:8}}>Status</th>
              <th style={{padding:8}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} style={{ borderTop: "1px solid #f0f0f0" }}>
                <td style={{padding:8}}>{s.id}</td>
                <td style={{padding:8}}>{s.name}</td>
                <td style={{padding:8, textAlign:"right"}}>{s.score ?? "-"}</td>
                <td style={{padding:8, textAlign:"right"}}>{s.final ?? "-"}</td>
                <td style={{padding:8, textAlign:"center"}}>
                  {s.status === "PASS" ? (
                    <span style={{ background: "#ecfdf5", color: "#16a34a", padding: "4px 8px", borderRadius: 6 }}>PASS</span>
                  ) : (
                    <span style={{ background: "#fff1f2", color: "#dc2626", padding: "4px 8px", borderRadius: 6 }}>FAIL</span>
                  )}
                </td>
                <td style={{padding:8}}>
                  <button type="button" onClick={()=>startEdit(s)} style={{marginRight:8}}>Edit</button>
                  <button type="button" onClick={()=>removeStudent(s.id)} style={{marginRight:8}}>Delete</button>
                  <button
                    type="button"
                    onClick={() => openStudentPath(s.id)}
                    style={{ marginRight: 8 }}
                    disabled={!!recommendLoading[s.id]}
                  >
                    Open Path
                  </button>
                  <button
                    type="button"
                    onClick={() => getRecommendationInline(s.id)}
                    disabled={!!recommendLoading[s.id]}
                  >
                    {recommendLoading[s.id] ? "Loading…" : "Quick Recommend"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {currentPath && (
        <div id="recommend-panel" style={{ marginTop: 20, padding: 12, background: "#fff", borderRadius:8 }}>
          <h3>Recommended for {currentPath.studentId}</h3>
          <ol>
            {currentPath.recommended?.length ? currentPath.recommended.map(t => (
              <li key={t.id} style={{ marginBottom: 8 }}>
                <strong>{t.title || t.id}</strong>
                <div style={{ fontSize: 12, color: "#666" }}>{t.id}</div>
                <button
                  onClick={() => markAsMastered(currentPath.studentId, t.id)}
                  style={{ marginLeft: 8 }}
                >
                  Mark as mastered
                </button>
              </li>
            )) : <li>No recommendations</li>}
          </ol>
          <button onClick={()=>setCurrentPath(null)}>Close</button>
        </div>
      )}
    </div>
  );
}

export default Students;
