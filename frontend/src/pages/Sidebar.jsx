// frontend/src/components/Sidebar.jsx
import { Link, useNavigate } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.clear(); // clear session
    navigate("/"); // back to login
  }

  const linkStyle = {
    display: "block",
    padding: "10px 16px",
    textDecoration: "none",
    color: "#111",
    borderRadius: "6px",
    marginBottom: "4px",
  };

  const linkHover = {
    background: "#e5e7eb",
  };

  const sidebarStyle = {
    width: "220px",
    minHeight: "100vh",
    background: "#f3f4f6",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  };

  return (
    <div style={sidebarStyle}>
      <div>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>Teacher Panel</h2>
        <nav>
            <Link to="/teacher/dashboard" style={linkStyle}>
                📊 Dashboard
            </Link>
            <Link to="/teacher/students" style={linkStyle}>
                👩‍🎓 Students
            </Link>
            <Link to="/teacher/topics" style={linkStyle}>
                📚 Topics
            </Link>
            <Link to="/teacher/content" style={linkStyle}>
                🧠 Content
            </Link>
        </nav>
      </div>

      <button
        onClick={handleLogout}
        style={{
          background: "#dc2626",
          color: "#fff",
          border: "none",
          padding: "10px",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </div>
  );
}
