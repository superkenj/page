import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  BrainCircuit,
  LogOut,
} from "lucide-react"; // if you installed lucide-react
// run: npm install lucide-react

export default function TeacherSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hover, setHover] = useState("");

  function handleLogout() {
    localStorage.clear();
    navigate("/");
  }

  const navItems = [
    { path: "/teacher/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { path: "/teacher/students", label: "Students", icon: <Users size={20} /> },
    { path: "/teacher/topics", label: "Topics", icon: <BookOpen size={20} /> },
    { path: "/teacher/content", label: "Content", icon: <BrainCircuit size={20} /> },
  ];

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-100 flex flex-col justify-between p-4">
      
      {/* Top Branding */}
      <div>
        <h1 className="text-2xl font-bold text-blue-600 mb-6 tracking-tight">
          PaGe <span className="text-gray-700">Teacher</span>
        </h1>

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all
                ${active 
                  ? "bg-blue-100 text-blue-700 font-semibold" 
                  : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <div
                  className={`p-2 rounded-lg 
                    ${active ? "bg-blue-200 text-blue-700" : "bg-gray-200 text-gray-700"}
                  `}
                >
                  {item.icon}
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="mt-6 flex items-center gap-3 bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition-all"
      >
        <LogOut size={20} />
        Logout
      </button>
    </div>
  );
}
