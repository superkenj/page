// frontend/src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserGraduate, FaBook } from "react-icons/fa";

const API_BASE = "http://localhost:5000";

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "teacher") navigate("/");
  }, []);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch(`${API_BASE}/teacher/summary`);
        const data = await res.json();
        setSummary(data);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;
  if (!summary) return <div>No data available</div>;

  const cardStyle = {
    flex: 1,
    background: "#fff",
    borderRadius: "12px",
    padding: "1.5rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    cursor: "pointer",
    transition: "transform 0.2s ease",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1.5rem",
    marginTop: "2rem",
  };

  const numberStyle = {
    fontSize: "2.5rem",
    fontWeight: "bold",
    marginBottom: "0.5rem",
  };

  const subStatStyle = {
    display: "flex",
    justifyContent: "space-around",
    marginTop: "1rem",
    width: "100%",
    fontSize: "0.9rem",
  };

  const iconStyle = {
    fontSize: "2rem",
    marginBottom: "0.5rem",
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ marginBottom: "1rem" }}>Teacher Dashboard</h1>

      <div style={gridStyle}>
        {/* Students Card */}
        <div
          style={cardStyle}
          onClick={() => navigate("/teacher/students")}
          onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <FaUserGraduate style={{ ...iconStyle, color: "#3b82f6" }} />
          <div style={{ ...numberStyle, color: "#3b82f6" }}>
            {summary.students_total}
          </div>
          <div style={{ fontWeight: "600" }}>Students</div>
          <div style={subStatStyle}>
            <span style={{ color: "#16a34a" }}>✔ {summary.students_pass} Pass</span>
            <span style={{ color: "#dc2626" }}>✘ {summary.students_fail} Fail</span>
          </div>
        </div>

        {/* Topics Card */}
        <div
          style={cardStyle}
          onClick={() => navigate("/teacher/topics")}
          onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <FaBook style={{ ...iconStyle, color: "#f59e0b" }} />
          <div style={{ ...numberStyle, color: "#f59e0b" }}>
            {summary.topic_count}
          </div>
          <div style={{ fontWeight: "600" }}>Topics</div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
