import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { formatDate } from "../utils/dateFormatter";
import API_BASE from "../config/api";

const Home = () => {
  const [subjects, setSubjects] = useState([]);
  const [completedExams, setCompletedExams] = useState(new Set());
  const [fullname, setFullname] = useState();
  const navigate = useNavigate();
  const status = localStorage.getItem("status");

  useEffect(() => {
    console.log(subjects);
  }, [subjects, setSubjects]);

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
      lang: subject["lang"] || "az", // Default to 'az' if not specified
      pre_exam: subject["Pre-Exam"],
      professor: subject["Professor"],
      fsk: subject["FSK"],
      fk: subject["FK"],
      qaib: subject["Qaib"],
      ep: subject["EP"], // Add EP parameter
    }));

    setSubjects(formattedSubjects);

    if (status === "student") {
      fetch(`${API_BASE}/completed-exams`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setCompletedExams(new Set(data.completedExams)))
        .catch((err) => console.error("Error fetching completed exams:", err));
    }
  }, [navigate, status]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
    window.location.reload();
  };

  const handleSubjectClick = (subject) => {
    console.log("Clicked subject:", subject);
    if (status === "teacher") {
      navigate(`/edit-questions/${subject.id}/${subject.lang}`);
    } else {
      // Only handle clicks for today's exams
      const examDate = parseExamDate(subject.exam_date);
      const today = getNormalizedCurrentDate();

      if (examDate && examDate.getTime() === today.getTime()) {
        if (!completedExams.has(subject.id)) {
          // Check EP parameter
          if (subject.ep === 31) {
            alert(
              "Qayıb limitini keçdiyinizə görə imtahanda iştirak edə bilməzsiniz."
            );
            return;
          } else if (subject.ep === 32) {
            alert("İmtahana qatıla bilməzsiniz. Təhsil haqqı ödənilməyib.");
            return;
          } else if (subject.ep !== 10) {
            alert(
              "İmtahana qatıla bilməzsiniz. İmtahan parametri uyğun deyil."
            );
            return;
          }

          console.log(
            "Navigating to exam:",
            `/exam/${subject.id}/${subject.lang}`
          );
          navigate(`/exam/${subject.id}/${subject.lang}`);
        }
      }
    }
  };

  const formattedString = (str) => {
    if (!str) return "";
    return str.slice(0, str.lastIndexOf(" ") + 1).trim();
  };

  // Get current date normalized to midnight for comparison
  const getNormalizedCurrentDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0, 0); // Set to midnight
    return today;
  };

  // Parse exam_date (DD/MM/YYYY) and normalize to midnight
  const parseExamDate = (examDate) => {
    try {
      if (!examDate) {
        console.log("No exam date provided");
        return null;
      }

      console.log("Parsing exam date:", examDate);

      // Handle DD/MM/YYYY format
      const [day, month, year] = examDate.split("/").map(Number);
      console.log("Split date parts:", { day, month, year });

      if (!day || !month || !year) {
        console.log("Invalid date parts");
        return null;
      }

      const date = new Date(year, month - 1, day);
      date.setHours(0, 0, 0, 0);

      console.log("Parsed date:", date);

      if (isNaN(date.getTime())) {
        console.log("Invalid date after parsing");
        return null;
      }

      return date;
    } catch (error) {
      console.error("Error parsing exam_date:", error);
      return null;
    }
  };

  const isExamDateToday = (examDate) => {
    const examDateTime = parseExamDate(examDate);
    if (!examDateTime) return false;

    const currentDate = getNormalizedCurrentDate();
    return examDateTime.getTime() === currentDate.getTime();
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
            const isEligible = subject.ep === 10;

            return (
              <div
                key={subject.id}
                onClick={() =>
                  status === "teacher"
                    ? handleSubjectClick(subject)
                    : isEligible && handleSubjectClick(subject)
                }
                className={`bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-300 ${
                  status === "teacher" || isEligible
                    ? "hover:scale-105 hover:shadow-xl cursor-pointer"
                    : "cursor-not-allowed opacity-75"
                }`}
              >
                {status === "teacher" ? (
                  <div className="p-6 bg-indigo-600 text-white text-center flex flex-col items-center justify-center h-full hover:bg-indigo-700 transition-all duration-300">
                    <h3 className="text-lg font-semibold mb-2">
                      {subject.name}
                    </h3>
                    <p className="text-sm">Fənnin kodu: {subject.id}</p>
                    <p className="text-sm mt-2">
                      Dil: {subject.lang === "az" ? "Azərbaycan" : "English"}
                    </p>
                  </div>
                ) : isCompleted ? (
                  <div className="p-6 bg-gray-200 text-gray-600 text-center cursor-not-allowed opacity-75 flex flex-col items-center justify-center h-full">
                    <h3 className="text-lg font-semibold mb-2">
                      {subject.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      İmtahan vaxtı: {formatDate(subject.exam_date)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Fənn qrupu: {subject.fenn_qrupu}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Dil: {subject.lang === "az" ? "Azərbaycan" : "English"}
                    </p>
                    <p className="text-sm text-gray-500 mt-1 space-x-2">
                      <span className="text-sm text-gray-500">
                        Giriş balı: {subject.pre_exam}
                      </span>
                      <span className="text-sm text-gray-500">
                        Q/b: {subject.qaib}
                      </span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Müəllim: {subject.professor}
                    </p>
                    <p className="text-sm text-red-500 mt-2">Bitmişdir</p>
                  </div>
                ) : !isEligible ? (
                  <div className="p-6 bg-gray-100 text-gray-500 text-center cursor-not-allowed opacity-75 flex flex-col items-center justify-center h-full">
                    <h3 className="text-lg font-semibold mb-2">
                      {subject.name}
                    </h3>
                    <p className="text-sm">
                      İmtahan vaxtı: {formatDate(subject.exam_date)}
                    </p>
                    <p className="text-sm mt-1">
                      Fənn qrupu: {subject.fenn_qrupu}
                    </p>
                    <p className="text-sm mt-1">
                      Dil: {subject.lang === "az" ? "Azərbaycan" : "English"}
                    </p>
                    <p className="text-sm mt-1 space-x-2">
                      <span className="text-sm">
                        Giriş balı: {subject.pre_exam}
                      </span>
                      <span className="text-sm">Q/b: {subject.qaib}</span>
                    </p>
                    <p className="text-sm mt-1">Müəllim: {subject.professor}</p>
                    <p className="text-sm text-red-600 mt-2">
                      {subject.ep === 31
                        ? "Qayıb limitini keçdiyinizə görə imtahanda iştirak edə bilməzsiniz."
                        : subject.ep === 32
                        ? "Təhsil haqqı ödənilmədiyinə görə imtahanda iştirak edə bilməzsiniz."
                        : "İmtahan parametri uyğun olmadığı üçün iştirak edə bilməzsiniz."}
                    </p>
                  </div>
                ) : isToday ? (
                  <div className="p-6 bg-indigo-600 text-white text-center flex flex-col items-center justify-center h-full hover:bg-indigo-700 transition-all duration-300">
                    <h3 className="text-lg font-semibold mb-2">
                      {subject.name}
                    </h3>
                    <p className="text-sm">
                      İmtahan vaxtı: {formatDate(subject.exam_date)}
                    </p>
                    <p className="text-sm mt-1">
                      Fənn qrupu: {subject.fenn_qrupu}
                    </p>
                    <p className="text-sm mt-1">
                      Dil: {subject.lang === "az" ? "Azərbaycan" : "English"}
                    </p>
                    <p className="text-sm mt-1 space-x-2">
                      <span className="text-sm">
                        Giriş balı: {subject.pre_exam}
                      </span>
                      <span className="text-sm">Q/b: {subject.qaib}</span>
                    </p>
                    <p className="text-sm mt-1">Müəllim: {subject.professor}</p>
                  </div>
                ) : (
                  <div className="p-6 bg-gray-100 text-gray-500 text-center cursor-not-allowed opacity-75 flex flex-col items-center justify-center h-full">
                    <h3 className="text-lg font-semibold mb-2">
                      {subject.name}
                    </h3>
                    <p className="text-sm">
                      İmtahan vaxtı: {formatDate(subject.exam_date)}
                    </p>
                    <p className="text-sm mt-1">
                      Fənn qrupu: {subject.fenn_qrupu}
                    </p>
                    <p className="text-sm mt-1">
                      Dil: {subject.lang === "az" ? "Azərbaycan" : "English"}
                    </p>
                    <p className="text-sm mt-1 space-x-2">
                      <span className="text-sm">
                        Giriş balı: {subject.pre_exam}
                      </span>
                      <span className="text-sm">Q/b: {subject.qaib}</span>
                    </p>
                    <p className="text-sm mt-1">Müəllim: {subject.professor}</p>
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
          {status === "teacher"
            ? "Müəllimin fənləri mövcud deyil."
            : "Tələbənin fənləri mövcud deyil."}
        </p>
      )}
    </div>
  );
};

export default Home;
