import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const API_BASE = "http://localhost:5000/api";

const Home = () => {
  const [subjects, setSubjects] = useState([]);
  const [completedExams, setCompletedExams] = useState(new Set()); // Store completed exams
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const storedSubjects = JSON.parse(localStorage.getItem("subjects")) || [];
    const formattedSubjects = storedSubjects.map((subject) => ({
      id: subject["Fənnin kodu"],
      name: subject["Fənnin adı"],
    }));

    setSubjects(formattedSubjects);

    // Fetch completed exams
    fetch(`${API_BASE}/completed-exams`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setCompletedExams(new Set(data.completedExams)))
      .catch((err) => console.error("Error fetching completed exams:", err));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("subjects");
    localStorage.removeItem("studentId");
    localStorage.removeItem("forceSubmit");
    navigate("/login");
    window.location.reload();
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
            <div key={subject.id} className="relative">
              {completedExams.has(subject.id) ? (
                <div className="p-4 bg-gray-400 text-white rounded-lg text-center cursor-not-allowed opacity-50">
                  {subject.name} (Bitdi)
                </div>
              ) : (
                <Link
                  to={`/exam/${subject.id}`}
                  className="p-4 bg-blue-500 text-white rounded-lg text-center hover:bg-blue-600 flex items-center justify-center"
                >
                  {subject.name}
                </Link>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 text-center">No subjects available.</p>
      )}
    </div>
  );
};

export default Home;
