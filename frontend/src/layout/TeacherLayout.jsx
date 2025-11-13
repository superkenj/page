import TeacherSidebar from "./TeacherSidebar";

export default function TeacherLayout({ children }) {
  return (
    <div style={{ display: "flex" }}>
      <TeacherSidebar />
      <div style={{ flex: 1, padding: "1rem" }}>
        {children} {/* ✅ This renders your Dashboard or Students page */}
      </div>
    </div>
  );
}
