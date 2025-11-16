// frontend/src/layout/TeacherSidebar.jsx
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function TeacherSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    localStorage.clear();
    navigate("/");
  }

  const sidebar = {
    width: "240px",
    height: "100vh",
    position: "sticky",
    top: 0,
    background: "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)",
    color: "white",
    padding: "24px 20px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxShadow: "4px 0 12px rgba(0,0,0,0.1)",
  };

  const navItem = {
    padding: "12px 14px",
    borderRadius: "8px",
    marginBottom: "8px",
    fontWeight: 500,
    cursor: "pointer",
    textDecoration: "none",
    display: "block",
    transition: "0.2s",
  };

  const activeStyle = {
    background: "rgba(255,255,255,0.22)",
    backdropFilter: "blur(4px)",
  };

  const hoverStyle = {
    background: "rgba(255,255,255,0.14)",
  };

  return (
    <aside style={sidebar}>

      {/* Header */}
      <div style={{ flex: 1, overflowY: "auto", paddingRight: "6px" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <img
            src="https://cdn-icons-png.flaticon.com/512/2784/2784598.png"
            alt="Teacher icon"
            style={{ width: 70, marginBottom: 10 }}
          />
          <h2 style={{ fontSize: "1.3rem", margin: 0, fontWeight: "bold" }}>
            Teacher Panel
          </h2>
        </div>

        {/* Navigation */}
        <nav>
          <Link
            to="/teacher/dashboard"
            style={{
              ...navItem,
              ...(location.pathname.includes("/dashboard") ? activeStyle : {}),
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = hoverStyle.background)}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = location.pathname.includes("/dashboard")
                ? activeStyle.background
                : "transparent")
            }
          >
            📊 Dashboard
          </Link>

          <Link
            to="/teacher/students"
            style={{
              ...navItem,
              ...(location.pathname.includes("/students") && !location.pathname.includes("/path")
                ? activeStyle
                : {}),
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = hoverStyle.background)}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background =
                location.pathname.includes("/students") &&
                !location.pathname.includes("/path")
                  ? activeStyle.background
                  : "transparent")
            }
          >
            👩‍🎓 Students
          </Link>

          <Link
            to="/teacher/topics"
            style={{
              ...navItem,
              ...(location.pathname.includes("/topics") &&
              !location.pathname.includes("/content")
                ? activeStyle
                : {}),
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = hoverStyle.background)}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background =
                location.pathname.includes("/topics") &&
                !location.pathname.includes("/content")
                  ? activeStyle.background
                  : "transparent")
            }
          >
            📚 Topics
          </Link>

          <Link
            to="/teacher/content"
            style={{
              ...navItem,
              ...(location.pathname.includes("/content") ? activeStyle : {}),
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = hoverStyle.background)}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background =
                location.pathname.includes("/content")
                  ? activeStyle.background
                  : "transparent")
            }
          >
            🧠 Content
          </Link>

          <Link
            to="/teacher/reports"
            style={{
              ...navItem,
              ...(location.pathname.includes("/reports") ? activeStyle : {}),
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = hoverStyle.background)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background =
                location.pathname.includes("/reports")
                  ? activeStyle.background
                  : "transparent")
            }
          >
            📑 Reports
          </Link>

        </nav>
      </div>

      {/* Bottom actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        
        {/* Feedback Button */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("openFeedbackModal"))}
          style={{
            background: "#0ea5e9",
            color: "white",
            border: "none",
            padding: "12px",
            borderRadius: "8px",
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
            letterSpacing: "0.5px",
            transition: "0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#0284c7")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#0ea5e9")}
        >
          💬 Feedback
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            background: "#ef4444",
            color: "white",
            border: "none",
            padding: "12px",
            borderRadius: "8px",
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
            letterSpacing: "0.5px",
            transition: "0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#dc2626")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#ef4444")}
        >
          🔓 Logout
        </button>
      </div>
    </aside>
  );
}
