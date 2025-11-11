import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://page-jirk.onrender.com";

export default function LoginPage() {
  const [id, setId] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Login failed");

      // Save session data
      localStorage.setItem("user", JSON.stringify(json));
      localStorage.setItem("role", json.role);

      // Redirect based on role
      if (json.role === "teacher") navigate("/teacher/dashboard");
      else if (json.role === "student") navigate(`/student-dashboard/${json.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{
      maxWidth: 400,
      margin: "100px auto",
      textAlign: "center",
      border: "1px solid #ccc",
      borderRadius: 10,
      padding: 20
    }}>
      <h1>Welcome to PaGe</h1>
      <p style={{ color: "#555" }}>Enter your ID to continue</p>

      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Enter your ID"
          value={id}
          onChange={e => setId(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 6,
            border: "1px solid #ccc",
            marginBottom: 10
          }}
        />
        <button
          type="submit"
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 6,
            background: "#16a34a",
            color: "#fff",
            border: "none",
            cursor: "pointer"
          }}
        >
          Login
        </button>
      </form>

      {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>}
    </div>
  );
}
