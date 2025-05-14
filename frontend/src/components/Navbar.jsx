import { useNavigate } from "react-router-dom";
import { useExam } from "../context/ExamContext";
import { logo } from "../assets";
import API_BASE from "../config/api";

const Navbar = () => {
  const navigate = useNavigate();
  const { isExamActive, setIsExamActive } = useExam();
  const status = localStorage.getItem("status");

  const handleNavigation = async (path) => {
    if (isExamActive) {
      const confirmLeave = window.confirm(
        "Siz imtahanı tərk edirsiniz! Əgər çıxarsanız, 0 bal alacaqsınız!"
      );
      if (confirmLeave) {
        try {
          await submitZeroScore();
          setIsExamActive(false);
          navigate(path);
        } catch (error) {
          console.log("Force submit failed:", error);
        }
      }
    } else {
      navigate(path);
    }
  };

  const submitZeroScore = async () => {
    const subjectCode = window.location.pathname.split("/").pop();
    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        subjectCode: subjectCode,
        answers: [],
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to force submit");
    }
  };

  return (
    <nav className="bg-indigo-800 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img src={logo} alt="BAAU Logo" className="size-14" />
          <h1 className="text-2xl font-bold tracking-tight">BAAU</h1>
        </div>
        <div className="flex items-center space-x-6">
          <button
            onClick={() => handleNavigation("/")}
            className="relative px-3 py-2 text-gray-200 font-medium hover:text-white transition-colors duration-200 group cursor-pointer"
          >
            Ana Səhifə
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center"></span>
          </button>
          {status === "student" && (
            <button
              onClick={() => handleNavigation("/results")}
              className="relative px-3 py-2 text-gray-200 font-medium hover:text-white transition-colors duration-200 group cursor-pointer"
            >
              Nəticələr
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center"></span>
            </button>
          )}
          {status === "staff" && (
            <button
              onClick={() => handleNavigation("/admin/add-question")}
              className="relative px-3 py-2 text-gray-200 font-medium hover:text-white transition-colors duration-200 group"
            >
              Sual Əlavə Et
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center"></span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
