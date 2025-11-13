// frontend/src/layout/TeacherLayout.jsx
import { Outlet } from "react-router-dom";
import TeacherSidebar from "./TeacherSidebar";

export default function TeacherLayout() {
  return (
    <div
      style={{
        display: "flex",
        background: "linear-gradient(to bottom, #eef7ff, #ffffff)",
        minHeight: "95vh",
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
        <Outlet />
      </main>
    </div>
  );
}
