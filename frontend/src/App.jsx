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

const App = () => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [subjects, setSubjects] = useState(
    JSON.parse(localStorage.getItem("subjects")) || []
  );

  useEffect(() => {
    setToken(localStorage.getItem("token"));
  }, []);

  return (
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
            path="/exam/:subject"
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
  );
};

export default App;
