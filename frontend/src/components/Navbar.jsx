import { useNavigate } from "react-router-dom";
import { useExam } from "../context/ExamContext";
import { logo } from "../assets";
import API_BASE from "../config/api";
import { useState } from "react";

const Navbar = () => {
  const navigate = useNavigate();
  const { isExamActive } = useExam();
  const status = localStorage.getItem("status");
  const [studentInfo, setStudentInfo] = useState({
    fullname: localStorage.getItem("fullname") || "",
    studentId: localStorage.getItem("studentId") || "",
    group: localStorage.getItem("group") || "",
    faculty: localStorage.getItem("faculty") || "",
    ixtisaslasma: localStorage.getItem("ixtisaslasma") || "",
  });

  const handleNavigation = (path) => {
    if (!isExamActive) {
      navigate(path);
    }
  };

  return (
    <nav className="bg-indigo-800 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        {/* Student Info - Only show if status is student and we have a studentId */}
        {status === "student" && studentInfo.studentId && (
          <div className="flex items-center space-x-4">
            <img
              src={`${API_BASE}/uploads/students/${studentInfo.studentId}.jpg`}
              alt="Student"
              className="size-24 rounded-full object-cover border-2 border-white"
            />
            <div className="flex flex-col">
              <span className="text-lg font-medium">
                {studentInfo.fullname}
              </span>
              <span className="text-sm opacity-75">
                Tələbə kodu: {studentInfo.studentId}
              </span>
              <span className="text-sm opacity-75">
                İxtisaslaşma: {studentInfo.ixtisaslasma}
              </span>
              {studentInfo.group && (
                <span className="text-sm opacity-75">
                  İxtisas qrupunun kodu: {studentInfo.group}
                </span>
              )}
              {studentInfo.faculty && (
                <span className="text-sm opacity-75">
                  Fakültə: {studentInfo.faculty}
                </span>
              )}
            </div>
          </div>
        )}

        {(status === "staff" || status === "teacher") && (
          <div className="flex items-center space-x-4">
            <img src={logo} alt="BAAU Logo" className="size-24" />
            {/* <h1 className="text-2xl font-bold tracking-tight">BAAU</h1> */}
          </div>
        )}

        <div className="flex items-center space-x-6">
          <button
            onClick={() => handleNavigation("/")}
            disabled={isExamActive}
            className={`relative px-3 py-2 font-medium transition-colors duration-200 group ${
              isExamActive
                ? "text-gray-500 cursor-not-allowed"
                : "text-gray-200 hover:text-white cursor-pointer"
            }`}
          >
            Ana Səhifə
            <span
              className={`absolute bottom-0 left-0 w-full h-0.5 bg-indigo-400 transform ${
                isExamActive ? "scale-x-0" : "scale-x-0 group-hover:scale-x-100"
              } transition-transform duration-300 origin-center`}
            ></span>
          </button>
          {status === "student" && (
            <button
              onClick={() => handleNavigation("/results")}
              disabled={isExamActive}
              className={`relative px-3 py-2 font-medium transition-colors duration-200 group ${
                isExamActive
                  ? "text-gray-500 cursor-not-allowed"
                  : "text-gray-200 hover:text-white cursor-pointer"
              }`}
            >
              Nəticələr
              <span
                className={`absolute bottom-0 left-0 w-full h-0.5 bg-indigo-400 transform ${
                  isExamActive
                    ? "scale-x-0"
                    : "scale-x-0 group-hover:scale-x-100"
                } transition-transform duration-300 origin-center`}
              ></span>
            </button>
          )}
          {/* {status === "staff" && (
            <button
              onClick={() => handleNavigation("/admin/add-question")}
              className="relative px-3 py-2 text-gray-200 font-medium hover:text-white transition-colors duration-200 group cursor-pointer"
            >
              Sual Əlavə Et
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center"></span>
            </button>
          )} */}
          {status === "staff" && (
            <>
              <button
                onClick={() => handleNavigation("/admin/export-questions")}
                disabled={isExamActive}
                className={`relative px-3 py-2 font-medium transition-colors duration-200 group ${
                  isExamActive
                    ? "text-gray-500 cursor-not-allowed"
                    : "text-gray-200 hover:text-white cursor-pointer"
                }`}
              >
                Sualları Yüklə
                <span
                  className={`absolute bottom-0 left-0 w-full h-0.5 bg-indigo-400 transform ${
                    isExamActive
                      ? "scale-x-0"
                      : "scale-x-0 group-hover:scale-x-100"
                  } transition-transform duration-300 origin-center`}
                ></span>
              </button>
              <button
                onClick={() => handleNavigation("/admin/protocol")}
                disabled={isExamActive}
                className={`relative px-3 py-2 font-medium transition-colors duration-200 group ${
                  isExamActive
                    ? "text-gray-500 cursor-not-allowed"
                    : "text-gray-200 hover:text-white cursor-pointer"
                }`}
              >
                Protokol
                <span
                  className={`absolute bottom-0 left-0 w-full h-0.5 bg-indigo-400 transform ${
                    isExamActive
                      ? "scale-x-0"
                      : "scale-x-0 group-hover:scale-x-100"
                  } transition-transform duration-300 origin-center`}
                ></span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
