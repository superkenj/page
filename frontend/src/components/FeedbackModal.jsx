import { useState, useEffect } from "react";

const API_BASE = "https://page-jirk.onrender.com";

export default function FeedbackModal() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("openFeedbackModal", handler);
    return () => window.removeEventListener("openFeedbackModal", handler);
  }, []);

  async function submitFeedback() {
    if (!type || !message.trim()) {
      alert("Please select issue type and describe the issue.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message }),
      });

      if (!res.ok) throw new Error("Failed");

      alert("Feedback sent! Thank you.");
      setOpen(false);
      setType("");
      setMessage("");
    } catch (err) {
      alert("Failed to send feedback.");
    }
  }

  if (!open) return null;

  return (
    <div style={overlay}>
      <div style={modal}>
        <h2>Submit Feedback</h2>

        <label>Type of Issue</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={input}
        >
          <option value="">-- Select --</option>
          <option value="bug">🐞 Bug</option>
          <option value="ui">🎨 UI Issue</option>
          <option value="feature">✨ Feature Request</option>
          <option value="other">Other</option>
        </select>

        <label>Description</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="Describe the issue or suggestion..."
          style={textarea}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={() => setOpen(false)}>Cancel</button>
          <button onClick={submitFeedback} style={{ background: "#2563eb", color: "white" }}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

/* Styles */
const overlay = {
  position: "fixed",
  top: 0, left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const modal = {
  background: "white",
  padding: 20,
  borderRadius: 10,
  width: 420,
  boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
};

const input = {
  width: "100%",
  padding: 10,
  marginBottom: 12,
  borderRadius: 8,
  border: "1px solid #ccc",
};

const textarea = {
  width: "100%",
  padding: 10,
  marginBottom: 12,
  borderRadius: 8,
  border: "1px solid #ccc",
  resize: "vertical",
};
