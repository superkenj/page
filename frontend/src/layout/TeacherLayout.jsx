export default function TeacherLayout() {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",   // IMPORTANT
      }}
    >
      <TeacherSidebar />

      <main
        style={{
          flex: 1,
          height: "100vh",
          overflowY: "auto",  // scroll only here
          background: "#f8fbff",
          padding: "2rem",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
