import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("subjects");
    localStorage.removeItem("studentId");
    localStorage.removeItem("forceSubmit");
    localStorage.removeItem("status");
    navigate("/login");
    window.location.reload();
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold">Admin Panel</h2>
      <div className="flex justify-between items-center">
        <p>
          Welcome! Here you can manage exams, view results, and handle students.
        </p>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 cursor-pointer inter inter-500"
        >
          Çıxış
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
