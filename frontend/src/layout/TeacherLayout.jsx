import TeacherSidebar from "./TeacherSidebar";

export default function TeacherLayout({ children }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f9fafb" }}>
      <TeacherSidebar />

      <div style={{ flex: 1, padding: "2rem" }}>
        {children}
      </div>
    </div>
  );
}
