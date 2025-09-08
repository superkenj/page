import { useAuth } from "../components/Auth";

function Dashboard() {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div style={{ padding: "2rem", position: "relative" }}>
      <button
        onClick={handleLogout}
        style={{
          position: "absolute",
          top: "2rem",
          right: "2rem",
          backgroundColor: "#ef4444",
          color: "white",
          padding: "0.5rem 1rem",
          borderRadius: "0.375rem",
          border: "none",
          cursor: "pointer",
          fontWeight: "500"
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = "#dc2626"}
        onMouseOut={(e) => e.target.style.backgroundColor = "#ef4444"}
      >
        Logout
      </button>
      
      <h1>Dashboard</h1>
      <p>Welcome, Teacher! Choose an option from the sidebar.</p>
    </div>
  );
}

export default Dashboard;