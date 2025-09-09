// frontend/src/pages/Students.jsx
import { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:5000"; // change if backend is hosted elsewhere

function Students() {
  const [students, setStudents] = useState([]);
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [score, setScore] = useState("");
  const [finalScore, setFinalScore] = useState("");
  const [currentPath, setCurrentPath] = useState(null);
  const [loading, setLoading] = useState(false);

  async function fetchStudents() {
    setLoading(true);
    try {
      // If you want list-all endpoint, add it to Flask; otherwise fetch known IDs.
      // We'll assume you want to fetch a list: create endpoint /students/list in Flask (below).
      const res = await fetch(`${API_BASE}/students/list`);
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      console.error("Failed to load students", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStudents();
  }, []);

  async function saveStudent(e) {
    e.preventDefault();
    if (!id || !name || !score || !finalScore) {
      alert("Please fill all fields");
      return;
    }
    if (Number(score) > Number(finalScore)) {
      alert("Score cannot exceed final score");
      return;
    }
    try {
      const payload = {
        name,
        score: Number(score),
        final: Number(finalScore),
        scores: { general: Number(score) },
        finals: { general: Number(finalScore) },
      };
      const res = await fetch(`${API_BASE}/students/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      // refresh
      setId(""); setName(""); setScore(""); setFinalScore("");
      await fetchStudents();
    } catch (err) {
      console.error(err);
      alert("Could not save student: " + err.message);
    }
  }

  async function getRecommendation(studentId) {
    try {
      const res = await fetch(`${API_BASE}/students/${studentId}/path`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get recommendation");
      }
      const data = await res.json();
      setCurrentPath({ studentId, recommended: data.recommended });
    } catch (err) {
      console.error(err);
      alert("Recommendation error: " + err.message);
    }
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Manage Students</h1>

      <form onSubmit={saveStudent} style={{ marginBottom: "1rem" }}>
        <input placeholder="Student ID" value={id} onChange={e=>setId(e.target.value)} />
        <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
        <input placeholder="Score" type="number" value={score} onChange={e=>setScore(e.target.value)} />
        <input placeholder="Final Score" type="number" value={finalScore} onChange={e=>setFinalScore(e.target.value)} />
        <button type="submit">Save Student</button>
      </form>

      <div style={{ marginBottom: 12 }}>
        <strong>Students</strong>
        {loading ? <div>Loading…</div> : null}
      </div>

      <ul>
        {students.map(s => (
          <li key={s.id} style={{ marginBottom: 8 }}>
            <div>
              <strong>{s.id}</strong>: {s.name} → Score {s.score}/{s.final || s.final_score || "?"} → {s.status || ""}
            </div>
            <div style={{ marginTop: 6 }}>
              <button onClick={() => getRecommendation(s.id)} style={{ marginRight: 8 }}>
                Get Recommendation
              </button>
            </div>
          </li>
        ))}
      </ul>

      {currentPath && (
        <div style={{ marginTop: 20 }}>
          <h3>Recommended path for {currentPath.studentId}</h3>
          <ol>
            {currentPath.recommended.map(t => <li key={t}>{t}</li>)}
          </ol>
        </div>
      )}
    </div>
  );
}

export default Students;
