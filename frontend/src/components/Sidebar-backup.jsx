import { NavLink } from "react-router-dom";

function Sidebar() {
  const linkStyle = ({ isActive }) => ({
    display: "block",
    padding: "8px 10px",
    borderRadius: "8px",
    textDecoration: "none",
    color: isActive ? "#fff" : "#333",
    background: isActive ? "#3b82f6" : "transparent",
    marginBottom: "6px",
  });

  return (
    <div style={{
      width: 220, height: "100vh", background: "#f7f7f7",
      padding: "1rem", boxSizing: "border-box", borderRight: "1px solid #e5e7eb"
    }}>
      <h2 style={{ marginTop: 0 }}>Teacher</h2>
      <nav>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li><NavLink to="/dashboard" style={linkStyle}>Dashboard</NavLink></li>
          <li><NavLink to="/students" style={linkStyle}>Students</NavLink></li>
          <li><NavLink to="/topics" style={linkStyle}>Topics</NavLink></li>
        </ul>
      </nav>
    </div>
  );
}

export default Sidebar;
