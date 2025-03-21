import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const Home = () => {
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    const storedSubjects = JSON.parse(localStorage.getItem("subjects")) || [];

    // Convert backend data to match frontend expectations
    const formattedSubjects = storedSubjects.map((subject, index) => ({
      id: subject["Fənnin kodu"], // Use "Fənnin kodu" as id
      name: subject["Fənnin adı"], // Use "Fənnin adı" as name
    }));

    setSubjects(formattedSubjects);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("subjects");
    window.location.href = "/login";
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
              to={`/exam/${subject.id}`}
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
