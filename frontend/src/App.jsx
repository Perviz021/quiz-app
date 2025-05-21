import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useState, useEffect, Suspense, lazy } from "react";
import Navbar from "./components/Navbar";
import { ExamProvider } from "./context/ExamContext.jsx";
import { ToastContainer } from "react-toastify";

// Lazy load components
const Home = lazy(() => import("./pages/Home"));
const Exam = lazy(() => import("./pages/Exam"));
const Results = lazy(() => import("./pages/Results"));
const Login = lazy(() => import("./pages/Login"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Review = lazy(() => import("./pages/Review"));
const AddQuestion = lazy(() => import("./pages/AddQuestion"));
const ExportQuestions = lazy(() => import("./pages/ExportQuestions"));
const EditQuestions = lazy(() => import("./pages/EditQuestions"));
const Protocol = lazy(() => import("./pages/Protocol"));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
  </div>
);

const App = () => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [subjects, setSubjects] = useState(
    JSON.parse(localStorage.getItem("subjects")) || []
  );
  const [status, setStatus] = useState(localStorage.getItem("status"));

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
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Common Routes */}
              <Route
                path="/login"
                element={
                  <Login setToken={setToken} setSubjects={setSubjects} />
                }
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
                  <Route path="/admin/protocol" element={<Protocol />} />
                  <Route
                    path="/edit-questions/:subjectCode/:lang"
                    element={<EditQuestions />}
                  />
                </>
              )}

              {/* Teacher Routes */}
              {status === "teacher" && (
                <>
                  <Route
                    path="/teacher"
                    element={<Home subjects={subjects} />}
                  />
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
          </Suspense>
        </div>
      </Router>
    </ExamProvider>
  );
};

export default App;
