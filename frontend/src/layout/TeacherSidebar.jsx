// frontend/src/layout/TeacherLayout.jsx
import TeacherSidebar from "./TeacherSidebar";

export default function TeacherLayout({ children }) {
  return (
    <div
      style={{
        display: "flex",
        background: "linear-gradient(to bottom, #eef7ff, #ffffff)",
        minHeight: "100vh",
      }}
    >
      <TeacherSidebar />
      <main
        style={{
          flex: 1,
          padding: "2rem",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        {children}
      </main>
    </div>
  );
}
