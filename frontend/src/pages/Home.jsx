import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000"; // Update if deployed

const Home = () => {
  const [subjects, setSubjects] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE}/subjects`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`, // Send token with request
      },
    })
      .then((res) => res.json())
      .then(setSubjects)
      .catch((err) => console.error("Error fetching subjects:", err));
  }, []);

  // ✅ Logout function
  const handleLogout = () => {
    localStorage.removeItem("token"); // Clear JWT token
    navigate("/login"); // Redirect to login page
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Available Subjects</h2>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 cursor-pointer"
        >
          Logout
        </button>
      </div>

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
