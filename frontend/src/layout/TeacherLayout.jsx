import { Outlet } from "react-router-dom";
import TeacherSidebar from "./TeacherSidebar";

export default function TeacherLayout() {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      
      {/* FIXED SIDEBAR */}
      <TeacherSidebar />

      {/* ONLY THIS PART SHOULD SCROLL */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "2rem",
          background: "#f8fbff",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
