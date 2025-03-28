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
import Login from "./pages/Login"; // Ensure this file exists
import { ExamProvider } from "./context/ExamContext.jsx";

const App = () => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [subjects, setSubjects] = useState(
    JSON.parse(localStorage.getItem("subjects")) || []
  );

  useEffect(() => {
    setToken(localStorage.getItem("token"));
  }, []);

  useEffect(() => {
    token ? setToken(localStorage.getItem("token")) : setToken("");
  }, [token]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "forceSubmit" && e.newValue === "true") {
        // You might want to add additional force submit logic here
        localStorage.removeItem("forceSubmit");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <ExamProvider>
      <Router>
        {token && <Navbar />}
        <div className="">
          <Routes>
            <Route
              path="/"
              element={
                token ? <Home subjects={subjects} /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/exam/:subjectCode"
              element={token ? <Exam /> : <Navigate to="/login" />}
            />
            <Route
              path="/results"
              element={token ? <Results /> : <Navigate to="/login" />}
            />
            <Route
              path="/login"
              element={<Login setToken={setToken} setSubjects={setSubjects} />}
            />
          </Routes>
        </div>
      </Router>
    </ExamProvider>
  );
};

export default App;
