import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const API_BASE = "http://localhost:5000"; // Update if deployed

const Home = () => {
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/subjects`)
      .then((res) => res.json())
      .then(setSubjects)
      .catch((err) => console.error("Error fetching subjects:", err));
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Available Subjects</h2>

      {subjects.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <Link
              key={subject.id}
              to={`/exam/${subject.name.toLowerCase()}`}
              className="p-4 bg-blue-500 text-white rounded-lg text-center hover:bg-blue-600"
            >
              {subject.name}
            </Link>
          ))}
        </div>
      ) : (
        <p>No subjects available.</p>
      )}
    </div>
  );
};

export default Home;
