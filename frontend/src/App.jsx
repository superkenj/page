import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Topics from "./pages/Topics";
import TopicsGraph from "./pages/TopicsGraph";
import StudentPath from "./pages/StudentPath";

function App() {
  return (
    <Router>
      <div style={{ display: "flex" }}>
        <Sidebar />
        <div style={{ flex: 1, padding: "1rem" }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />         {/* fallback root */}
            <Route path="/dashboard" element={<Dashboard />} /> {/* explicit */}
            <Route path="/students" element={<Students />} />
            <Route path="/students/:id/path" element={<StudentPath />} />
            <Route path="/topics" element={<Topics />} />
            <Route path="/topics/graph" element={<TopicsGraph />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
