import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const Home = () => {
  const [subjects, setSubjects] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login"); // Redirect if not logged in
      return;
    }

    const storedSubjects = JSON.parse(localStorage.getItem("subjects")) || [];

    // Ensure correct format from backend
    const formattedSubjects = storedSubjects.map((subject) => ({
      id: subject["Fənnin kodu"], // Use "Fənnin kodu" as id
      name: subject["Fənnin adı"], // Use "Fənnin adı" as name
    }));

    setSubjects(formattedSubjects);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("subjects");
    localStorage.removeItem("studentId");
    navigate("/login");
    window.location.reload(); // 🔄 Hard reload the page
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Bütün fənlər</h2>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 cursor-pointer"
        >
          Çıxış
        </button>
      </div>

      {subjects.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <Link
              key={subject.id}
              to={`/exam/${subject.id}`}
              className="p-4 bg-blue-500 text-white rounded-lg text-center hover:bg-blue-600 flex items-center justify-center"
            >
              {subject.name}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 text-center">No subjects available.</p>
      )}
    </div>
  );
};

export default Home;
