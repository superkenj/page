// frontend/src/pages/StudentSidebar.jsx
import { Link, useNavigate, useParams } from "react-router-dom";

export default function StudentSidebar() {
  const navigate = useNavigate();
  const { id: studentId } = useParams();

  function handleLogout() {
    localStorage.clear();
    navigate("/");
  }

  const linkStyle = {
    display: "block",
    padding: "10px 16px",
    textDecoration: "none",
    color: "#111",
    borderRadius: "6px",
    marginBottom: "4px",
  };

  const linkHover = { background: "#e5e7eb" };

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
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>Student Panel</h2>
        <nav>
          <Link
            to={`/student-dashboard/${studentId}`}
            style={linkStyle}
            onMouseOver={(e) => Object.assign(e.target.style, linkHover)}
            onMouseOut={(e) => (e.target.style.background = "none")}
          >
            🏠 Dashboard
          </Link>
          <Link
            to={`/student-dashboard/${studentId}?tab=topics`}
            style={linkStyle}
            onMouseOver={(e) => Object.assign(e.target.style, linkHover)}
            onMouseOut={(e) => (e.target.style.background = "none")}
          >
            📚 My Topics
          </Link>
          <Link
            to={`/student-dashboard/${studentId}?tab=progress`}
            style={linkStyle}
            onMouseOver={(e) => Object.assign(e.target.style, linkHover)}
            onMouseOut={(e) => (e.target.style.background = "none")}
          >
            🧾 Progress
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
