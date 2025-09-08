import { Link } from "react-router-dom";

function Sidebar() {
  return (
    <div style={{
      width: "200px",
      height: "100vh",
      background: "#f4f4f4",
      padding: "1rem",
      boxSizing: "border-box"
    }}>
      <h2>Teacher</h2>
      <nav>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li><Link to="/">Dashboard</Link></li>
          <li><Link to="/students">Students</Link></li>
          <li><Link to="/topics">Topics</Link></li>
        </ul>
      </nav>
    </div>
  );
}

export default Sidebar;
