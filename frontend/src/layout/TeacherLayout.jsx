import { Outlet } from "react-router-dom";
import TeacherSidebar from "./TeacherSidebar";

export default function TeacherLayout() {
  return (
    <div style={{
      display: "flex",
      overflow: "hidden"
    }}>
      
      {/* FIXED SIDEBAR */}
      <TeacherSidebar />

      {/* SCROLLABLE MAIN CONTENT */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          background: "#f8fbff",
          padding: "2rem"
        }}
      >
        <Outlet />
      </main>

    </div>
  );
}
