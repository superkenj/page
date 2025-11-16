import { useState, useEffect } from "react";

export default function FeedbackModal() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState("Bug");

  // 🔹 Listen for sidebar event: "openFeedbackModal"
  useEffect(() => {
    function handleOpen() {
      setOpen(true);
    }

    window.addEventListener("openFeedbackModal", handleOpen);
    return () => window.removeEventListener("openFeedbackModal", handleOpen);
  }, []);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "white",
          padding: "20px",
          borderRadius: "10px",
          width: "400px",
        }}
      >
        <h3>Send Feedback</h3>

        <label style={{ display: "block", marginTop: 10 }}>
          Feedback Type:
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{ width: "100%", padding: "8px", marginBottom: 10 }}
        >
          <option>Bug</option>
          <option>Feature Request</option>
          <option>UI Issue</option>
          <option>Other</option>
        </select>

        <textarea
          placeholder="Describe the issue..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{
            width: "100%",
            height: "120px",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />

        <div style={{ marginTop: 15, display: "flex", justifyContent: "space-between" }}>
          <button
            onClick={() => setOpen(false)}
            style={{ background: "#ccc", padding: "8px 12px", borderRadius: 6 }}
          >
            Cancel
          </button>

          <button
            onClick={() => {
              alert("Feedback sent! (Email backend pending)");
              setOpen(false);
            }}
            style={{ background: "#3b82f6", color: "white", padding: "8px 12px", borderRadius: 6 }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
