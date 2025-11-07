import Sidebar from "./Sidebar";

export default function TeacherLayout({ children }) {
  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div style={{ flex: 1, padding: "1rem" }}>
        {children} {/* ✅ This renders your Dashboard or Students page */}
      </div>
    </div>
  );
}
