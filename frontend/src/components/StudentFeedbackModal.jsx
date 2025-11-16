import { useEffect, useState } from "react";

export default function StudentFeedbackModal() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("Bug");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("openStudentFeedbackModal", handler);
    return () => window.removeEventListener("openStudentFeedbackModal", handler);
  }, []);

  if (!open) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2>Send Feedback</h2>

        <label>Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
          <option value="Bug">Bug</option>
          <option value="Suggestion">Suggestion</option>
          <option value="Other">Other</option>
        </select>

        <textarea
          placeholder="Write your feedback..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ ...inputStyle, height: "120px" }}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button style={cancelBtn} onClick={() => setOpen(false)}>Cancel</button>
          <button style={submitBtn}>Submit</button>
        </div>
      </div>
    </div>
  );
}

// --- Styles ---
const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalStyle = {
  background: "white",
  width: "400px",
  padding: "20px",
  borderRadius: "10px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: "6px",
  marginTop: "8px",
  marginBottom: "15px",
  border: "1px solid #ccc",
};

const cancelBtn = {
  padding: "8px 14px",
  background: "#ddd",
  border: "none",
  borderRadius: "6px",
};

const submitBtn = {
  padding: "8px 14px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "6px",
};
