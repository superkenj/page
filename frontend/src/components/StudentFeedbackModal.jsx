import { useEffect, useState } from "react";
import { API_BASE } from "../config";

export default function StudentFeedbackModal() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("Bug");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("openStudentFeedbackModal", handler);
    return () =>
      window.removeEventListener("openStudentFeedbackModal", handler);
  }, []);

  if (!open) return null;

  const studentId = localStorage.getItem("studentId");

  async function handleSubmit() {
    if (!message.trim()) {
      alert("Please enter your feedback.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/feedback/student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          type,
          message,
        }),
      });

      if (!res.ok) throw new Error("Failed to send feedback");

      alert("Feedback sent!");
      setOpen(false);
      setMessage("");
    } catch (err) {
      console.error("FEEDBACK ERROR:", err);
      if (err?.message) alert("Error: " + err.message);
      else alert("Unknown error");
      alert("FULL ERROR: " + JSON.stringify(err));
    }
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <h2>Send Feedback</h2>

        {/* TYPE */}
        <label style={label}>Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={input}
        >
          <option>Bug</option>
          <option>Suggestion</option>
          <option>Other</option>
        </select>

        {/* MESSAGE */}
        <label style={label}>Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your feedback..."
          style={textarea}
        />

        {/* BUTTONS */}
        <div style={buttonRow}>
          <button style={cancelBtn} onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button style={submitBtn} onClick={handleSubmit}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------- Styles ----------------- */

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const modal = {
  background: "white",
  padding: "24px",
  width: "420px",
  borderRadius: "10px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
};

const label = {
  fontWeight: "600",
  marginTop: "12px",
  marginBottom: "6px",
  display: "block",
};

const input = {
  width: "100%",
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  marginBottom: "10px",
};

const textarea = {
  width: "100%",
  height: "120px",
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  resize: "none", // 🔥 Prevents overflow
  marginBottom: "16px",
  boxSizing: "border-box",
};

const buttonRow = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
};

const cancelBtn = {
  background: "#e5e7eb",
  padding: "10px 16px",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
};

const submitBtn = {
  background: "#2563eb",
  color: "white",
  padding: "10px 16px",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
};
