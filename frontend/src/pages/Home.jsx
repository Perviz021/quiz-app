import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { formatDate } from "../utils/dateFormatter";
import API_BASE from "../config/api";

const Home = () => {
  const [subjects, setSubjects] = useState([]);
  const [completedExams, setCompletedExams] = useState(new Set()); // Store completed exams
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
    localStorage.removeItem("status");
    navigate("/login");
    window.location.reload();
  };

  const formattedString = (str) => {
    if (!str) return "";
    return str.slice(0, str.lastIndexOf(" ") + 1).trim();
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="mb-2 text-2xl font-semibold montserrat montserrat-700">
          Xoş gəlmisiniz, {formattedString(fullname)}!
        </div>
        {/* <h2 className="text-2xl font-bold montserrat montserrat-700">
          Bütün fənlər
        </h2> */}
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 cursor-pointer inter inter-500"
        >
          Çıxış
        </button>
      </div>

      {subjects.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="relative shadow-lg shadow-gray-400 rounded-lg overflow-hidden"
            >
              {completedExams.has(subject.id) ? (
                <div className="p-4 bg-gray-400 text-white text-center cursor-not-allowed opacity-50 inter inter-600 size-full flex items-center justify-center flex-col">
                  <p>{subject.name} (Bitmişdir) </p>
                  <p className="text-sm">
                    İmtahan vaxtı: {""}
                    {formatDate(subject.exam_date)}
                  </p>
                </div>
              ) : (
                <Link
                  to={`/exam/${subject.id}`}
                  className="p-4 bg-secondary text-white text-center hover:bg-main transition duration-300 ease-in-out flex items-center justify-center flex-col inter inter-600 space-y-1.5 size-full"
                >
                  <p>{subject.name}</p>
                  <p className="text-sm">
                    İmtahan vaxtı: {""}
                    {formatDate(subject.exam_date)}
                  </p>
                  <p className="text-sm">Fənn qrupu: {subject.fenn_qrupu}</p>
                </Link>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 text-center">
          Tələbənin fənləri mövcud deyil.
        </p>
      )}
    </div>
  );
};

export default Home;
