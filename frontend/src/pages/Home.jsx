import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { formatDate } from "../utils/dateFormatter";
import API_BASE from "../config/api";

const Home = () => {
  const [subjects, setSubjects] = useState([]);
  const [completedExams, setCompletedExams] = useState(new Set());
  const [fullname, setFullname] = useState();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    setFullname(localStorage.getItem("fullname"));

    if (!token) {
      navigate("/login");
      return;
    }

    const storedSubjects = JSON.parse(localStorage.getItem("subjects")) || [];
    const formattedSubjects = storedSubjects.map((subject) => ({
      id: subject["Fənnin kodu"],
      name: subject["Fənnin adı"],
      exam_date: subject["Exam_date"],
      fenn_qrupu: subject["Stable"],
    }));

    setSubjects(formattedSubjects);

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
    localStorage.removeItem("status");
    navigate("/login");
    window.location.reload();
  };

  const formattedString = (str) => {
    if (!str) return "";
    return str.slice(0, str.lastIndexOf(" ") + 1).trim();
  };

  // Get current date normalized to midnight for comparison
  const getNormalizedCurrentDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0, 0); // Set to midnight
    return today.getTime();
  };

  // Parse exam_date (epoch or DD/MM/YYYY) and normalize to midnight
  const parseExamDate = (examDate) => {
    try {
      let date;
      if (typeof examDate === "number" || /^\d+$/.test(examDate)) {
        // Handle epoch time (number or string of digits)
        date = new Date(Number(examDate));
      } else if (
        typeof examDate === "string" &&
        examDate.match(/^\d{2}\/\d{2}\/\d{4}$/)
      ) {
        // Handle DD/MM/YYYY format
        const [day, month, year] = examDate.split("/").map(Number);
        date = new Date(year, month - 1, day);
      } else {
        throw new Error("Invalid date format");
      }

      if (isNaN(date.getTime())) {
        throw new Error("Invalid date");
      }

      date.setHours(0, 0, 0, 0); // Normalize to midnight
      return date.getTime();
    } catch (error) {
      console.error("Error parsing exam_date:", error);
      return null; // Return null for invalid dates
    }
  };

  const isExamDateToday = (examDate) => {
    const examDateTime = parseExamDate(examDate);
    if (examDateTime === null) {
      return false; // Invalid dates are not today
    }
    const currentDate = getNormalizedCurrentDate();
    return examDateTime === currentDate;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Xoş Gəlmisiniz, {formattedString(fullname)}!
        </h1>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 cursor-pointer"
        >
          Çıxış
        </button>
      </div>

      {subjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => {
            const isToday = isExamDateToday(subject.exam_date);
            const isCompleted = completedExams.has(subject.id);

            return (
              <div
                key={subject.id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                {isCompleted ? (
                  <div className="p-6 bg-gray-200 text-gray-600 text-center cursor-not-allowed opacity-75 flex flex-col items-center justify-center h-full">
                    <h3 className="text-lg font-semibold mb-2">
                      {subject.name}
                    </h3>
                    <p className="text-sm text-gray-500">(Bitmişdir)</p>
                    <p className="text-sm text-gray-500 mt-1">
                      İmtahan vaxtı: {formatDate(subject.exam_date)}
                    </p>
                  </div>
                ) : isToday ? (
                  <Link
                    to={`/exam/${subject.id}`}
                    className="p-6 bg-indigo-600 text-white text-center flex flex-col items-center justify-center h-full hover:bg-indigo-700 transition-all duration-300"
                  >
                    <h3 className="text-lg font-semibold mb-2">
                      {subject.name}
                    </h3>
                    <p className="text-sm">
                      İmtahan vaxtı: {formatDate(subject.exam_date)}
                    </p>
                    <p className="text-sm mt-1">
                      Fənn qrupu: {subject.fenn_qrupu}
                    </p>
                  </Link>
                ) : (
                  <div className="p-6 bg-gray-100 text-gray-500 text-center cursor pojaw-allowed opacity-75 flex flex-col items-center justify-center h-full">
                    <h3 className="text-lg font-semibold mb-2">
                      {subject.name}
                    </h3>
                    <p className="text-sm">
                      İmtahan vaxtı: {formatDate(subject.exam_date)}
                    </p>
                    <p className="text-sm mt-1">
                      Fənn qrupu: {subject.fenn_qrupu}
                    </p>
                    <p className="text-sm text-red-600 mt-2">
                      Bu imtahan bugünkü tarix üçün mövcud deyil
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-600 text-center text-lg">
          Tələbənin fənləri mövcud deyil.
        </p>
      )}
    </div>
  );
};

export default Home;
