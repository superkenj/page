import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://page-jirk.onrender.com";

export default function LoginPage() {
  const [id, setId] = useState("");
  const [password, setPassword] = useState(""); // 👈 placeholder only
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 🌟 Wake up Render backend
  useEffect(() => {
    async function wakeServer() {
      try {
        const res = await fetch(`${API_BASE}/`);
        console.log("Backend wake-up status:", res.status);
      } catch (err) {
        console.warn("Backend wake-up failed:", err);
      } finally {
        setLoading(false);
      }
    }
    wakeServer();
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }), // password ignored for now
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Login failed");

      localStorage.setItem("user", JSON.stringify(json));
      localStorage.setItem("role", json.role);

      if (json.role === "teacher") navigate("/teacher/dashboard");
      else if (json.role === "student") navigate(`/student-dashboard/${json.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          marginTop: "120px",
          color: "#334155",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        <h2>Warming up the PaGe server 🔄</h2>
        <p>Please wait a few seconds...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #dbeafe 0%, #f0fdfa 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          padding: "40px 35px",
          borderRadius: "16px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
          textAlign: "center",
          width: "100%",
          maxWidth: "400px",
          transition: "transform 0.3s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
      >
        <h1 style={{ marginBottom: "8px", color: "#1d4ed8" }}>🌟 Welcome to PaGe</h1>
        <p style={{ color: "#6b7280", marginBottom: 24 }}>
          Enter your ID and password to begin your learning journey!
        </p>

        <form onSubmit={handleLogin} style={{ width: "100%" }}>
          <input
            type="text"
            placeholder="Enter your ID"
            value={id}
            onChange={(e) => setId(e.target.value)}
            style={{
              width: "100%",
              height: "48px", // ✅ exact height match
              padding: "0 14px", // ✅ horizontal text padding only
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              marginBottom: "12px",
              fontSize: "16px",
              lineHeight: "48px", // ✅ vertical centering for text
              boxSizing: "border-box",
              outlineColor: "#3b82f6",
              fontFamily: "Poppins, sans-serif",
            }}
          />

          <input
            type="password"
            placeholder="Enter your password (optional)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              height: "48px", // ✅ same height as above
              padding: "0 14px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              marginBottom: "20px",
              fontSize: "16px",
              lineHeight: "48px",
              boxSizing: "border-box",
              outlineColor: "#3b82f6",
              fontFamily: "Poppins, sans-serif",
            }}
          />

          <button
            type="submit"
            style={{
              width: "100%",
              height: "48px", // ✅ identical height to inputs
              padding: "0 14px",
              borderRadius: "10px",
              background: "linear-gradient(90deg,#16a34a,#22c55e)",
              color: "white",
              border: "1px solid transparent",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "16px",
              boxSizing: "border-box",
              transition: "all 0.3s ease",
              fontFamily: "Poppins, sans-serif",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background =
                "linear-gradient(90deg,#22c55e,#16a34a)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background =
                "linear-gradient(90deg,#16a34a,#22c55e)")
            }
          >
            🚀 Login
          </button>
        </form>

        {error && (
          <p
            style={{
              color: "#ef4444",
              marginTop: "12px",
              fontWeight: "500",
              fontSize: "14px",
            }}
          >
            {error}
          </p>
        )}

        <div style={{ marginTop: 24, fontSize: 14, color: "#64748b" }}>
          <p>✨ Learning made fun and personal — with PaGe!</p>
        </div>
      </div>
    </div>
  );
}
