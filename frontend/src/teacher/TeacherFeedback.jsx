import { useEffect, useState } from "react";

const API_BASE = "https://page-jirk.onrender.com";

export default function TeacherFeedback() {
  const [feedback, setFeedback] = useState([]);

  useEffect(() => {
    async function loadFeedback() {
      const res = await fetch(`${API_BASE}/feedback/all`);
      const data = await res.json();
      setFeedback(data);
    }
    loadFeedback();
  }, []);

  return (
    <div>
      <h2 style={{ marginBottom: "1.5rem" }}>📨 Student Feedback</h2>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#e8f0ff" }}>
            <th style={th}>Student</th>
            <th style={th}>Type</th>
            <th style={th}>Message</th>
            <th style={th}>Date</th>
          </tr>
        </thead>

        <tbody>
          {feedback.length === 0 && (
            <tr>
              <td colSpan="4" style={{ textAlign: "center", padding: 20 }}>
                No feedback yet.
              </td>
            </tr>
          )}

          {feedback.map((f) => (
            <tr key={f._id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={td}>{f.studentName || "Unknown"}</td>
              <td style={td}>{f.type}</td>
              <td style={td}>{f.message}</td>
              <td style={td}>{new Date(f.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th = {
  padding: "12px",
  textAlign: "left",
  fontWeight: "bold",
};

const td = {
  padding: "12px",
};
