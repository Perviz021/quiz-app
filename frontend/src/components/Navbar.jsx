import { useNavigate } from "react-router-dom";
import { useExam } from "../context/ExamContext";

const Navbar = () => {
  const navigate = useNavigate();
  const { isExamActive, setIsExamActive } = useExam();

  const handleNavigation = async (path) => {
    if (isExamActive) {
      const confirmLeave = window.confirm(
        "Siz imtahanı tərk edirsiniz! Əgər çıxarsanız, 0 bal alacaqsınız!"
      );
      if (confirmLeave) {
        try {
          // localStorage.setItem("forceSubmit", "true");
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
    const subjectCode = window.location.pathname.split("/").pop(); // Get subjectCode from URL
    const token = localStorage.getItem("token");

    const response = await fetch(`http://localhost:5000/api/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        subjectCode: subjectCode,
        answers: [], // Empty array forces 0 score
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to force submit");
    }
  };

  return (
    <nav className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex justify-between">
        <h1 className="text-xl font-bold">Quiz App</h1>
        <div>
          <button
            onClick={() => handleNavigation("/")}
            className="mr-4 hover:underline cursor-pointer"
          >
            Home
          </button>
          <button
            onClick={() => handleNavigation("/results")}
            className="hover:underline cursor-pointer"
          >
            Results
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
