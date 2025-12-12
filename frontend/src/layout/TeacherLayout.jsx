import { Outlet } from "react-router-dom";
import TeacherSidebar from "./TeacherSidebar";

export default function TeacherLayout() {
  return (
    <div style={{
      display: "flex",
      height: "100vh",
      overflow: "hidden"
    }}>
      
      {/* FIXED SIDEBAR */}
      <TeacherSidebar />

      {/* SCROLLABLE MAIN CONTENT */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          minWidth: 0,
          background: "#f8fbff",
          padding: "2rem"
        }}
      >
        <Outlet />
      </main>

    </div>
  );
}
