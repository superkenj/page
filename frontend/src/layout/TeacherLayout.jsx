import TeacherSidebar from "./TeacherSidebar";

export default function TeacherLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <TeacherSidebar />

      <div className="flex-1 p-6">
        {children}
      </div>
    </div>
  );
}
