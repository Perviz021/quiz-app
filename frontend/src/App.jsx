import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Exam from "./pages/Exam";
import Results from "./pages/Results";

const App = () => {
  return (
    <Router>
      <Navbar />
      <div className="p-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/exam/:subject" element={<Exam />} />
          <Route path="/results" element={<Results />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
