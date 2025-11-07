import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import TeacherLayout from "./pages/TeacherLayout";
import StudentLayout from "./pages/StudentLayout";

// Teacher pages
import Dashboard from "./pages/Dashboard";
import Topics from "./pages/Topics";
import TopicsGraph from "./pages/TopicsGraph";
import TeacherContent from "./pages/TeacherContent";
import Students from "./pages/Students";
import StudentPath from "./pages/StudentPath";
import TeacherTopicContents from "./pages/TeacherTopicContents";

// Student pages
import StudentDashboard from "./pages/StudentDashboard";
import StudentTopicContent from "./pages/StudentTopicContent";

// Common login
import LoginPage from "./pages/LoginPage";

function App() {
  return (
    <Router>
      <Routes>
        {/* 🧑‍🏫 Teacher Routes */}
        <Route
          path="/teacher/dashboard"
          element={
            <TeacherLayout>
              <Dashboard />
            </TeacherLayout>
          }
        />
        <Route
          path="/teacher/students"
          element={
            <TeacherLayout>
              <Students />
            </TeacherLayout>
          }
        />
        <Route
          path="/teacher/students/:id/path"
          element={
            <TeacherLayout>
              <StudentPath />
            </TeacherLayout>
          }
        />
        <Route
          path="/students/:id/path"
          element={
            <TeacherLayout>
              <StudentPath />
            </TeacherLayout>
          }
        />
        <Route
          path="/teacher/topics"
          element={
            <TeacherLayout>
              <Topics />
            </TeacherLayout>
          }
        />
        <Route
          path="/teacher/topics/graph"
          element={
            <TeacherLayout>
              <TopicsGraph />
            </TeacherLayout>
          }
        />
        <Route
          path="/teacher/content"
          element={
            <TeacherLayout>
              <TeacherContent />
            </TeacherLayout>
          }
        />
        <Route 
          path="/teacher/content/:topicId" 
          element={
            <TeacherTopicContents />
          } 
        />

        {/* 👩‍🎓 Student Routes */}
        <Route path="/student-dashboard/:id" element={<StudentLayout />}>
          <Route index element={<StudentDashboard />} />
        </Route>

        <Route 
          path="/student-dashboard/:id/topic/:topic_id" 
          element={<StudentTopicContent />} 
        />

        {/* Common login */}
        <Route path="/" element={<LoginPage />} />
      </Routes>
    </Router>
  );
}

export default App;
