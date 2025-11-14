// frontend/src/layout/TeacherLayout.jsx
import { Outlet, useLocation } from "react-router-dom";
import TeacherSidebar from "./TeacherSidebar";

export default function TeacherLayout() {
  const location = useLocation();

  // Hide the sidebar only for: /teacher/students/:id/path
  const hideSidebar =
    location.pathname.startsWith("/teacher/students/") &&
    location.pathname.endsWith("/path");
  
  return (
    <div
      style={{
        display: "flex",
        background: "linear-gradient(to bottom, #eef7ff, #ffffff)",
        minHeight: "95vh",
      }}
    >
      {!hideSidebar && <TeacherSidebar />}

      <main
        style={{
          flex: 1,
          padding: "2rem",
          maxWidth: hideSidebar ? "100%" : "1100px",
          margin: "0 auto",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
