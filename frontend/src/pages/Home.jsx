import { Link, useNavigate } from "react-router-dom";

const Home = ({ subjects }) => {
  const navigate = useNavigate();

  // ✅ Logout function
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("subjects"); // Clear subjects
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
          {subjects.map((subject, index) => (
            <Link
              key={index}
              to={`/exam/${subject.toLowerCase()}`}
              className="p-4 bg-blue-500 text-white rounded-lg text-center hover:bg-blue-600"
            >
              {subject}
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
