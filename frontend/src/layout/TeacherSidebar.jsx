import { Link, useNavigate, useLocation } from "react-router-dom";

export default function TeacherSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const sidebar = {
    width: "220px",
    minHeight: "100vh",
    background: "#ffffff",
    borderRight: "1px solid #ddd",
    padding: "1.2rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  };

  const titleStyle = {
    fontSize: "1.6rem",
    fontWeight: "bold",
    marginBottom: "1.5rem",
    color: "#2563eb",
  };

  const menuItem = (active) => ({
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 14px",
    textDecoration: "none",
    color: active ? "#1d4ed8" : "#374151",
    background: active ? "#dbeafe" : "transparent",
    borderRadius: "10px",
    marginBottom: "6px",
    fontSize: "1rem",
    fontWeight: active ? "600" : "400",
  });

  const logoutBtn = {
    background: "#dc2626",
    color: "#fff",
    padding: "10px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontSize: "1rem",
  };

  return (
    <div style={sidebar}>
      <div>
        <h2 style={titleStyle}>PaGe Teacher</h2>

        <Link
          to="/teacher/dashboard"
          style={menuItem(location.pathname.includes("dashboard"))}
        >
          📊 Dashboard
        </Link>

        <Link
          to="/teacher/students"
          style={menuItem(location.pathname.includes("students"))}
        >
          👩‍🎓 Students
        </Link>

        <Link
          to="/teacher/topics"
          style={menuItem(location.pathname.includes("topics"))}
        >
          📚 Topics
        </Link>

        <Link
          to="/teacher/content"
          style={menuItem(location.pathname.includes("content"))}
        >
          🧠 Content
        </Link>
      </div>

      <button onClick={() => navigate("/")} style={logoutBtn}>
        Logout
      </button>
    </div>
  );
}
