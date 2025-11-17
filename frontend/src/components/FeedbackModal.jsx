import { useState, useEffect } from "react";
import { API_BASE } from "../config";

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
          borderRadius: "12px",
          width: "420px",
          maxWidth: "90vw",
          margin: "0 auto",
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
            resize: "vertical",
            minHeight: "120px",
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            boxSizing: "border-box",
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
            onClick={async () => {
                console.log("API_BASE =", API_BASE);
                if (!message.trim()) {
                    alert("Please enter a message.");
                    return;
                }

                try {
                    const res = await fetch(`${API_BASE}/send-feedback`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ type, message }),
                    });

                    if (!res.ok) throw new Error("Failed to send");

                    alert("Feedback sent!");
                    setOpen(false);
                    setMessage("");
                }   catch (err) {
                    console.error(err);
                    alert("Failed to send email");
                }
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
