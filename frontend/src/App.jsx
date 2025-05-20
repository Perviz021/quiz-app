import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Exam from "./pages/Exam";
import Results from "./pages/Results";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard"; // Import the admin page
import { ExamProvider } from "./context/ExamContext.jsx";
import Review from "./pages/Review.jsx";
import AddQuestion from "./pages/AddQuestion.jsx";
import { ToastContainer } from "react-toastify";
import ExportQuestions from "./pages/ExportQuestions.jsx";
import EditQuestions from "./pages/EditQuestions.jsx";

const App = () => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [subjects, setSubjects] = useState(
    JSON.parse(localStorage.getItem("subjects")) || []
  );
  const [status, setStatus] = useState(localStorage.getItem("status")); // New state for status

  useEffect(() => {
    setToken(localStorage.getItem("token"));
    setStatus(localStorage.getItem("status"));
  }, []);

  useEffect(() => {
    token ? setToken(localStorage.getItem("token")) : setToken("");
    setStatus(localStorage.getItem("status"));
  }, [token]);

  return (
    <ExamProvider>
      <Router>
        {token && <Navbar />}
        <div>
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
          <Routes>
            {/* Common Routes */}
            <Route
              path="/login"
              element={<Login setToken={setToken} setSubjects={setSubjects} />}
            />

            {/* Students Routes */}
            {status === "student" && (
              <>
                <Route path="/" element={<Home subjects={subjects} />} />
                <Route path="/exam/:subjectCode/:lang" element={<Exam />} />
                <Route path="/results" element={<Results />} />
                <Route path="/review/:subjectCode" element={<Review />} />
              </>
            )}

            {/* Admin Routes */}
            {status === "staff" && (
              <>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/add-question" element={<AddQuestion />} />
                <Route
                  path="/admin/export-questions"
                  element={<ExportQuestions />}
                />
                <Route
                  path="/edit-questions/:subjectCode/:lang"
                  element={<EditQuestions />}
                />
              </>
            )}

            {/* Teacher Routes */}
            {status === "teacher" && (
              <>
                <Route path="/teacher" element={<Home subjects={subjects} />} />
                <Route
                  path="/edit-questions/:subjectCode/:lang"
                  element={<EditQuestions />}
                />
              </>
            )}

            {/* Redirect users based on their role */}
            <Route
              path="*"
              element={
                status === "staff" ? (
                  <Navigate to="/admin" />
                ) : status === "teacher" ? (
                  <Navigate to="/teacher" />
                ) : status === "student" ? (
                  <Navigate to="/" />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
          </Routes>
        </div>
      </Router>
    </ExamProvider>
  );
};

export default App;
