import { useNavigate } from "react-router-dom";
import { useExam } from "../context/ExamContext";
import { logo } from "../assets";

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

    const response = await fetch(`http://localhost:5000/api/submit`, {
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
    <nav className="bg-main text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center justify-evenly space-x-2">
          <img src={logo} alt="Logo" className="size-12 mr-2" />
          <h1 className="text-xl montserrat montserrat-700">BAAU</h1>
        </div>
        <div className="flex space-x-8">
          <button
            onClick={() => handleNavigation("/")}
            className="group relative px-2 py-4 montserrat text-[#eee] montserrat-600 hover:text-white transition-colors cursor-pointer"
          >
            Ana səhifə
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center"></span>
          </button>
          {status === "student" && (
            <button
              onClick={() => handleNavigation("/results")}
              className="group relative px-2 py-4 montserrat montserrat-600 text-[#eee] hover:text-white transition-colors cursor-pointer"
            >
              Nəticələr
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center"></span>
            </button>
          )}

          {status === "staff" && (
            <button
              onClick={() => handleNavigation("/admin/add-question")}
              className="group relative px-2 py-4 montserrat montserrat-600 text-[#eee] hover:text-white transition-colors cursor-pointer"
            >
              Sual Əlavə Et
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center"></span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
