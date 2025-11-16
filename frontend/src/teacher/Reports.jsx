// frontend/src/teacher/Reports.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
const API = "https://page-jirk.onrender.com";

export default function TeacherReports() {
  const [summary, setSummary] = useState(null);
  const [topics, setTopics] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [student, setStudent] = useState(null);
  const nav = useNavigate();

  useEffect(()=>{ load(); }, []);
  async function load() {
    const s = await (await fetch(`${API}/reports/class_summary`)).json();
    const t = await (await fetch(`${API}/reports/topics`)).json();
    setSummary(s);
    setTopics(t);
  }

  async function loadStudent() {
    if (!studentId) return alert("Enter student id");
    const r = await (await fetch(`${API}/reports/student/${studentId}`)).json();
    setStudent(r);
  }

  function exportCSV() {
    if (!summary) return;
    const rows = [["metric","value"]];
    rows.push(["totalStudents", summary.totalStudents]);
    rows.push(["pass", summary.pass]);
    rows.push(["fail", summary.fail]);
    rows.push(["avgPre", summary.avgPre]);
    rows.push(["avgPost", summary.avgPost]);
    rows.push([]);
    rows.push(["topic","mastered","attempted","difficulty"]);
    topics.forEach(t => rows.push([t.name, t.mastered, t.attempted, (t.difficulty*100).toFixed(1) + "%"]));
    const csv = rows.map(r => r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type: "text/csv"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "class_report.csv";
    a.click();
  }

  if (!summary) return <div style={{padding:20}}>Loading...</div>;
  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <h1>📊 Teacher Reports</h1>

      <div style={{ display:"flex", gap:12, marginBottom:16 }}>
        <div style={{ padding:12, background:"#fff", border:"1px solid #eee", borderRadius:8 }}>
          <div>Total students</div><div style={{fontSize:20}}>{summary.totalStudents}</div>
        </div>
        <div style={{ padding:12, background:"#fff", border:"1px solid #eee", borderRadius:8 }}>
          <div>Pass</div><div style={{fontSize:20}}>{summary.pass}</div>
        </div>
        <div style={{ padding:12, background:"#fff", border:"1px solid #eee", borderRadius:8 }}>
          <div>Fail</div><div style={{fontSize:20}}>{summary.fail}</div>
        </div>
        <div style={{ marginLeft:"auto" }}>
          <button onClick={exportCSV} style={{ padding:"8px 12px", borderRadius:8, background:"#2563eb", color:"#fff" }}>Export CSV</button>
        </div>
      </div>

      <h3>Topic difficulty</h3>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead><tr><th style={{textAlign:"left"}}>Topic</th><th>Mastered</th><th>Attempted</th><th>Difficulty</th></tr></thead>
        <tbody>
          {topics.map(t => (
            <tr key={t.id}>
              <td style={{padding:8}}>{t.name}</td>
              <td style={{padding:8, textAlign:"center"}}>{t.mastered}</td>
              <td style={{padding:8, textAlign:"center"}}>{t.attempted}</td>
              <td style={{padding:8, textAlign:"center"}}>{(t.difficulty*100).toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ marginTop: 24 }}>Per student</h3>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <input value={studentId} onChange={e=>setStudentId(e.target.value)} placeholder="student id" style={{ padding:8, borderRadius:6 }} />
        <button onClick={loadStudent} style={{ padding:"8px 12px", borderRadius:6, background:"#10b981", color:"#fff" }}>Load</button>
      </div>

      {student && (
        <div style={{ marginTop:12, padding:12, background:"#fff", border:"1px solid #eee", borderRadius:8 }}>
          <div><strong>{student.name} ({student.id})</strong></div>
          <div>Gender: {student.gender ?? "—"}</div>
          <div>Pre: {student.pre ?? "—"} | Post: {student.post ?? "—"}</div>
          <div>Improvement: {student.improvementPercent != null ? student.improvementPercent.toFixed(1) + "%" : "—"}</div>
        </div>
      )}
    </div>
  );
}
