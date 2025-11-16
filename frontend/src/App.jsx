import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import FeedbackModal from "./components/FeedbackModal";
import StudentFeedbackModal from "./components/StudentFeedbackModal";

/* Layouts */
import TeacherLayout from "./layout/TeacherLayout";
import StudentLayout from "./layout/StudentLayout";

/* Teacher Pages */
import TeacherDashboard from "./teacher/TeacherDashboard";
import Topics from "./teacher/Topics";
import TopicsGraph from "./teacher/TopicsGraph";
import TeacherContent from "./teacher/TeacherContent";
import Students from "./teacher/Students";
import StudentPath from "./teacher/StudentPath";
import TeacherTopicContents from "./teacher/TeacherTopicContents";
import TeacherReports from "./teacher/TeacherReports";
import TeacherFeedback from "./teacher/TeacherFeedback";

/* Student Pages */
import StudentDashboard from "./student/StudentDashboard";
import StudentTopicContent from "./student/StudentTopicContent";

/* Login */
import LoginPage from "./pages/LoginPage";

function App() {
  return (
    <Router>

      <FeedbackModal />
      <StudentFeedbackModal />

      <Routes>

        {/* ======================================
         🧑‍🏫 TEACHER ROUTES (Nested under layout)
        =======================================*/}
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="students/:id/path" element={<StudentPath />} />
          <Route path="topics" element={<Topics />} />
          <Route path="topics/graph" element={<TopicsGraph />} />
          <Route path="content" element={<TeacherContent />} />
          <Route path="content/:topicId" element={<TeacherTopicContents />} />
          <Route path="reports" element={<TeacherReports />} />
          <Route path="feedback" element={<TeacherFeedback />} />
        </Route>

        {/* ======================================
         👩‍🎓 STUDENT ROUTES (Nested under layout)
        =======================================*/}
        <Route path="/student-dashboard/:id" element={<StudentLayout />}>
          <Route index element={<StudentDashboard />} />
        </Route>

        {/* Student Content Page */}
        <Route
          path="/student-dashboard/:id/topic/:topicId"
          element={<StudentTopicContent />}
        />

        {/* ======================================
         🔐 LOGIN
        =======================================*/}
        <Route path="/" element={<LoginPage />} />
      </Routes>
    </Router>
  );
}

export default App;
