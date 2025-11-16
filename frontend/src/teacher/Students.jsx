// frontend/src/pages/Students.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://page-jirk.onrender.com";

function Students() {
  const navigate = useNavigate();
  
  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadThreshold, setUploadThreshold] = useState(0.5);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ id: "", name: "", gender: "", score: "", final: "" });
  const [editing, setEditing] = useState(false);
  const [currentPath, setCurrentPath] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recommendLoading, setRecommendLoading] = useState({}); // { studentId: bool }
  const [filter, setFilter] = useState("all"); // all | pass | fail
  const [query, setQuery] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "teacher") navigate("/");
  }, []);

  useEffect(() => { fetchStudents(); }, []);

  async function fetchStudents() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/students/list`);
      const data = await res.json();
      if (!res.ok) {throw new Error(data.message || data.error || "Failed to load students");}
      setStudents(data.students || []);
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
      gender: (form.gender || "").toLowerCase(), // store lowercase per your DB
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
      // reset including gender
      setForm({ id: "", name: "", gender: "", score: "", final: "" });
      setEditing(false);
      await fetchStudents();
    } catch (err) {
      console.error("saveStudent error:", err);
      alert("Could not save student: " + err.message);
    }
  }

  function startEdit(s) {
    setEditing(true);
    setForm({
      id: s.id,
      name: s.name,
      gender: s.gender ?? "",
      score: s.score ?? "",
      final: s.final ?? ""
    });
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
    navigate(`/teacher/students/${studentId}/path`);
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

  async function handleUploadCsv() {
    if (!csvFile) { alert("Choose a CSV file"); return; }
    setUploading(true);

    const text = await csvFile.text();
    // parse naive CSV: split lines, split by comma
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const rows = lines.map(line => {
      // naive split; assumes no commas inside fields
      const parts = line.split(",").map(p => p.trim());
      // expected: id,name,topic,score,final
      return parts;
    });

    // build per-student map
    const studentsMap = {};
    for (const parts of rows) {
      if (parts.length < 5) continue;
      const [sid, sname, topic, scoreStr, finalStr] = parts;
      if (!sid || !topic) continue;
      if (!studentsMap[sid]) studentsMap[sid] = { id: sid, name: sname || "", scores: {}, finals: {}, threshold: uploadThreshold };
      // try parse numbers
      const sc = Number(scoreStr);
      const fin = Number(finalStr);
      if (!Number.isNaN(sc)) studentsMap[sid].scores[topic] = sc;
      if (!Number.isNaN(fin)) studentsMap[sid].finals[topic] = fin;
    }

    const payload = Object.values(studentsMap);
    if (!payload.length) {
      alert("No valid rows found in CSV (expected columns: id,name,topic,score,final)");
      setUploading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/students/bulk_upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) {
        console.error("Upload error", json);
        alert("Upload failed: " + (json.error || "unknown"));
      } else {
        console.log("Upload result", json);
        alert("Upload finished. Updated " + json.results.length + " students.");
        await fetchStudents(); // refresh student list
      }
    } catch (err) {
      console.error("Upload exception", err);
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      setCsvFile(null);
    }
  }

  // Derived & filter
  const filtered = students.filter(s => {
    if (!s) return false;
    const q = query.trim().toLowerCase();
    if (q && !(s.id?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q))) return false;
    return true;
  });

  const totalStudents = students.length;
  const totalPass = students.filter(s => s.status === "PASS").length;
  const totalFail = totalStudents - totalPass;

  return (
    <div style={{ padding: 20 }}>
      <h1>Students</h1>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>

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
        <select
          value={form.gender || ""}
          onChange={(e) => setField("gender", e.target.value)}
          style={{ padding: 8 }}
        >
          <option value="">Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <input
          type="number"
          placeholder="Pre-test"
          value={form.score}
          onChange={(e) => setField("score", e.target.value)}
        />
        <input
          type="number"
          placeholder="Post-test"
          value={form.final}
          onChange={(e) => setField("final", e.target.value)}
        />
        <button type="submit" style={{ padding: "8px 12px" }}>{editing ? "Update" : "Add"}</button>
        <button type="button" onClick={() => { setEditing(false); setForm({ id: "", name: "", gender: "", score: "", final: "" }); }} style={{ padding: "8px 12px" }}>
          Reset
        </button>
      </form>

      {/* CSV Upload */}
      <div style={{ marginBottom: 16, padding: 12, border: "1px dashed #ccc", borderRadius: 8 }}>
        <div style={{ marginBottom: 8 }}><strong>Bulk upload scores (CSV)</strong></div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <input type="file" accept=".csv" onChange={e => setCsvFile(e.target.files?.[0] || null)} />
          <div>
            <label style={{ fontSize: 12, display: "block" }}>Threshold (fraction):</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={uploadThreshold}
              onChange={e => setUploadThreshold(Number(e.target.value))}
              style={{ width: 80 }}
            />
          </div>
          <button onClick={handleUploadCsv} disabled={!csvFile || uploading}>
            {uploading ? "Uploading..." : "Upload CSV"}
          </button>
        </div>

        <div style={{ fontSize: 12, color: "#666" }}>
          CSV format (rows): <code>student_id,student_name,topic_id,score,final</code><br />
          Multiple rows per student allowed — the uploader will group scores by student.
        </div>
      </div>

      {loading ? <div>Loading students...</div> : (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8 }}>
          <thead>
            <tr>
              <th style={{textAlign:"left", padding:8}}>ID</th>
              <th style={{textAlign:"left", padding:8}}>Name</th>
              <th style={{textAlign:"left", padding:8}}>Gender</th>
              <th style={{textAlign:"right", padding:8}}>Pre-test Score</th>
              <th style={{textAlign:"right", padding:8}}>Pre-test Total</th>
              <th style={{padding:8}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} style={{ borderTop: "1px solid #f0f0f0" }}>
                <td style={{padding:8}}>{s.id}</td>
                <td style={{padding:8}}>{s.name}</td>
                <td style={{padding:8}}>{s.gender === "male" ? "M" : s.gender === "female" ? "F" : "-"}</td>
                <td style={{padding:8, textAlign:"right"}}>{s.score ?? "-"} / {s.final ?? "-"}</td>
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
                  {/* Quick Recommend removed */}
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
