import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../config/api";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import TimeExtensionModal from "../components/TimeExtensionModal";
import ForceSubmitModal from "../components/ForceSubmitModal";

// Derive Socket.IO URL from VITE_API_BASE or use fallback
const SOCKET_SERVER_URL = import.meta.env.VITE_API_BASE
  ? import.meta.env.VITE_API_BASE.replace(/\/api$/, "")
  : API_BASE;

const socket = io(SOCKET_SERVER_URL, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 30000,
  autoConnect: true,
});

const AdminDashboard = () => {
  const [activeStudents, setActiveStudents] = useState([]);
  const navigate = useNavigate();
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [isForceSubmitModalOpen, setIsForceSubmitModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [examParamForm, setExamParamForm] = useState({
    studentId: "",
    subjectGroup: "",
    newEP: "10",
  });

  useEffect(() => {
    // Fetch initial active students
    fetch(`${API_BASE}/active-students`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setActiveStudents(data.students || []);
      })
      .catch((err) => {
        console.error("Error fetching students:", err);
        toast.error(`Tələbələri yükləmək mümkün olmadı: ${err.message}`);
      });

    // Socket.IO listeners
    socket.on("connect", () =>
      console.log("🟢 Admin socket connected:", socket.id)
    );
    socket.on("update_active_students", (students) => {
      console.log("Received active students update:", students);
      setActiveStudents(students || []);
    });
    socket.on("student_disconnected", ({ studentId }) => {
      console.log(`Student ${studentId} disconnected`);
      setActiveStudents((prev) => prev.filter((s) => s.id !== studentId));
    });
    socket.on("error", (message) => {
      console.error("Socket error:", message);
      toast.error(`Bağlantı xətası: ${message}`);
    });

    return () => {
      socket.off("connect");
      socket.off("update_active_students");
      socket.off("student_disconnected");
      socket.off("error");
    };
  }, []);

  const handleForceSubmitClick = (student) => {
    setSelectedStudent(student);
    setIsForceSubmitModalOpen(true);
  };

  const handleForceSubmitConfirm = async () => {
    if (!selectedStudent) return;

    try {
      const response = await fetch(`${API_BASE}/force-submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          subjectCode: selectedStudent.subjectCode,
          forceSubmit: true,
          answers: [],
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      toast.success("İmtahan bitirildi və tələbə 0 bal aldı.");
      setActiveStudents((prev) =>
        prev.filter((student) => student.id !== selectedStudent.id)
      );
      setIsForceSubmitModalOpen(false);
      setSelectedStudent(null);
    } catch (err) {
      console.error("Force submit error:", err);
      toast.error(`İmtahanı bitirmək mümkün olmadı: ${err.message}`);
    }
  };

  const handleExtendTime = (studentId) => {
    setSelectedStudent(studentId);
    setIsTimeModalOpen(true);
  };

  const handleTimeConfirm = (minutes) => {
    if (selectedStudent) {
      // Find the student to get their subjectCode
      const student = activeStudents.find((s) => s.id === selectedStudent);
      if (!student) return;

      // Make API call to persist the time extension
      fetch(`${API_BASE}/extend-time`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          studentId: selectedStudent,
          subjectCode: student.subjectCode,
          minutes: minutes,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          // Emit socket event to notify the student
          socket.emit("extend_time", {
            roomId: selectedStudent,
            minutes: minutes,
          });
          toast.success(`${minutes} dəqiqə əlavə edildi!`);
        })
        .catch((err) => {
          console.error("Extend time error:", err);
          toast.error(`Vaxt əlavə etmək mümkün olmadı: ${err.message}`);
        });
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
    window.location.reload();
  };

  const handleExamParamUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/update-exam-parameter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(examParamForm),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      toast.success("İmtahan parametri yeniləndi!");
      setExamParamForm({
        studentId: "",
        subjectGroup: "",
        newEP: "10",
      });
    } catch (error) {
      console.error("Update exam parameter error:", error);
      toast.error(
        `İmtahan parametrini yeniləmək mümkün olmadı: ${error.message}`
      );
    }
  };

  const formattedString = (str) => {
    if (!str) return "";
    return str.slice(0, str.lastIndexOf(" ") + 1).trim();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">
          Xoş Gəlmisiniz, {formattedString(localStorage.getItem("fullname"))}
        </h2>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 cursor-pointer"
        >
          Çıxış
        </button>
      </div>

      {/* Exam Parameter Management Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          İmtahan Parametrini Yenilə
        </h3>
        <form onSubmit={handleExamParamUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tələbə Kodu
              </label>
              <input
                type="text"
                value={examParamForm.studentId}
                onChange={(e) =>
                  setExamParamForm((prev) => ({
                    ...prev,
                    studentId: e.target.value,
                  }))
                }
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fənn Qrupu
              </label>
              <input
                type="text"
                value={examParamForm.subjectGroup}
                onChange={(e) =>
                  setExamParamForm((prev) => ({
                    ...prev,
                    subjectGroup: e.target.value,
                  }))
                }
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                İmtahan Parametri
              </label>
              <input
                type="number"
                value={examParamForm.newEP}
                onChange={(e) =>
                  setExamParamForm((prev) => ({
                    ...prev,
                    newEP: e.target.value,
                  }))
                }
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
                min="0"
                placeholder="İmtahan parametrini daxil edin"
              />
              <p className="text-xs text-gray-500 mt-1">
                Məlum parametrlər: 10 (icazə var), 31 (qayıb limiti), 32 (təhsil
                haqqı)
              </p>
            </div>
          </div>
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 cursor-pointer"
          >
            Yenilə
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Aktiv İmtahanda Olan Tələbələr
        </h3>
        {activeStudents?.length === 0 ? (
          <p className="text-gray-600 text-center">
            Hal-hazırda aktiv tələbə yoxdur.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-indigo-600 text-white">
                  <th className="p-4 text-left font-semibold">Ad Soyad</th>
                  <th className="p-4 text-left font-semibold">Fənn</th>
                  <th className="p-4 text-left font-semibold">Vaxt Qalıb</th>
                  <th className="p-4 text-left font-semibold">Bonus Vaxt</th>
                  <th className="p-4 text-left font-semibold">Əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {activeStudents?.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b border-gray-200 hover:bg-indigo-50 transition-colors duration-200"
                  >
                    <td className="p-4 text-gray-800">{student.fullname}</td>
                    <td className="p-4 text-gray-800">{student.subject}</td>
                    <td className="p-4 text-gray-800">
                      {String(Math.floor(student.timeLeft / 3600)).padStart(
                        2,
                        "0"
                      )}
                      :
                      {String(
                        Math.floor((student.timeLeft % 3600) / 60)
                      ).padStart(2, "0")}
                      :{String(student.timeLeft % 60).padStart(2, "0")}
                    </td>
                    <td className="p-4 text-gray-800">
                      {student.bonusTime || 0} dəq
                    </td>
                    <td className="p-4">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleForceSubmitClick(student)}
                          className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 cursor-pointer"
                        >
                          İmtahanı Bitir
                        </button>
                        <button
                          onClick={() => handleExtendTime(student.id)}
                          className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 cursor-pointer"
                        >
                          Vaxt Əlavə Et
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <TimeExtensionModal
        isOpen={isTimeModalOpen}
        onClose={() => setIsTimeModalOpen(false)}
        onConfirm={handleTimeConfirm}
      />
      <ForceSubmitModal
        isOpen={isForceSubmitModalOpen}
        onClose={() => {
          setIsForceSubmitModalOpen(false);
          setSelectedStudent(null);
        }}
        onConfirm={handleForceSubmitConfirm}
        studentName={selectedStudent?.fullname}
      />
    </div>
  );
};

export default AdminDashboard;
