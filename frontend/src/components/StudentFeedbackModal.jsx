import { useEffect, useState } from "react";

const API_BASE = "https://page-jirk.onrender.com";

export default function StudentFeedbackModal() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("Bug");
  const [message, setMessage] = useState("");

  useEffect(() => {
    window.addEventListener("openStudentFeedbackModal", () => setOpen(true));
  }, []);

  async function sendFeedback() {
    const studentId = localStorage.getItem("studentId");

    await fetch(`${API_BASE}/feedback/student`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, type, message }),
    });

    alert("Feedback submitted!");
    setOpen(false);
    setMessage("");
  }

  if (!open) return null;

  return (
    <div className="modalBackground">
      <div className="modalCard">
        <h2>Send Feedback</h2>

        <label style={{ fontWeight: 600 }}>Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="Bug">Bug</option>
          <option value="Suggestion">Suggestion</option>
          <option value="Confusing Lesson">Confusing Lesson</option>
        </select>

        <textarea
          placeholder="Write your feedback..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows="5"
        ></textarea>

        <div className="actions">
          <button onClick={() => setOpen(false)}>Cancel</button>
          <button onClick={sendFeedback}>Submit</button>
        </div>
      </div>
    </div>
  );
}
