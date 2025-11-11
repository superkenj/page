import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://page-jirk.onrender.com";

export default function StudentLogin() {
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`${API_BASE}/students/${studentId}`);
      if (!res.ok) throw new Error("Student not found");
      navigate(`/student-dashboard/${studentId}`); // Redirect to student-only dashboard
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", textAlign: "center" }}>
      <h1>Student Login</h1>
      <p style={{ color: "#666" }}>Enter your Student ID to access your dashboard</p>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Enter Student ID"
          value={studentId}
          onChange={e => setStudentId(e.target.value)}
          style={{
            width: "100%", padding: 10, marginBottom: 10, borderRadius: 6, border: "1px solid #ccc"
          }}
        />
        <button
          type="submit"
          style={{
            width: "100%", padding: 10, borderRadius: 6, background: "#16a34a", color: "white", border: "none"
          }}
        >
          Login
        </button>
      </form>
      {error && <p style={{ color: "red", marginTop: 8 }}>{error}</p>}
    </div>
  );
}
