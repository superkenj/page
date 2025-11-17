import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://page-jirk.onrender.com";

export default function LoginPage() {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function wakeServer() {
      try {
        await fetch(`${API_BASE}/`);
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
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Login failed");

      localStorage.setItem("user", JSON.stringify(json));
      localStorage.setItem("role", json.role);

      if (json.role === "teacher") navigate("/teacher/dashboard");
      else {
        localStorage.setItem("studentId", json.id);
        navigate(`/student-dashboard/${json.id}`);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "150px", color: "#555" }}>
        <h2>Warming up the server 🔄</h2>
        <p>Please wait a few seconds...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #dbeafe, #fce7f3)",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <div
        style={{
          width: "360px",
          background: "white",
          borderRadius: "16px",
          padding: "32px 28px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
          textAlign: "center",
        }}
      >
        <h1 style={{ color: "#1e3a8a", marginBottom: "8px", fontWeight: 700 }}>
          🌟 Welcome to PaGe
        </h1>
        <p style={{ color: "#64748b", marginBottom: "24px" }}>
          Enter your ID and password to begin your learning journey!
        </p>

        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Enter your ID"
            value={id}
            onChange={(e) => setId(e.target.value)}
            style={{
              width: "100%",
              height: "48px",
              padding: "0 14px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              marginBottom: "12px",
              fontSize: "16px",
              boxSizing: "border-box",
              outlineColor: "#3b82f6",
              transition: "0.2s",
            }}
          />

          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              height: "48px",
              padding: "0 14px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              marginBottom: "20px",
              fontSize: "16px",
              boxSizing: "border-box",
              outlineColor: "#3b82f6",
              transition: "0.2s",
            }}
          />

          {/* 🌈 Animated Button */}
          <button
            type="submit"
            style={{
              width: "100%",
              height: "48px",
              borderRadius: "10px",
              background: "linear-gradient(90deg,#16a34a,#22c55e)",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "16px",
              boxSizing: "border-box",
              transition: "all 0.2s ease",
              transform: "translateY(0)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 12px rgba(22,163,74,0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            🚀 Login
          </button>
        </form>

        {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}

        <p
          style={{
            color: "#94a3b8",
            fontSize: "14px",
            marginTop: "24px",
            fontStyle: "italic",
          }}
        >
          ✨ Learning made fun and personal — with PaGe!
        </p>
      </div>
    </div>
  );
}
