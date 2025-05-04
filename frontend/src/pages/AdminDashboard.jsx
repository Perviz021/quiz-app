import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../config/api";
import { toast } from "react-toastify";

const AdminDashboard = () => {
  const [activeStudents, setActiveStudents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE}/active-students`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setActiveStudents(data.students))
      .catch((err) => console.error("Error fetching students", err));
  }, []);

  const handleForceSubmit = (studentId, subjectCode) => {
    console.log("Force submit for:", studentId, subjectCode);

    fetch(`${API_BASE}/force-submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ studentId, subjectCode }),
    })
      .then(() => {
        toast.success("Imtahan bitirildi.");
        setActiveStudents((prev) =>
          prev.filter((student) => student.id !== studentId)
        );
      })
      .catch(() => toast.error("Xəta baş verdi."));
  };

  const handleAddTime = (studentId, subjectCode, minutes) => {
    fetch(`${API_BASE}/extend-time`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        studentId: studentId,
        subjectCode: subjectCode,
        minutes,
      }),
    })
      .then(() => toast.success("Vaxt əlavə edildi."))
      .catch(() => toast.error("Xəta baş verdi."));
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
    window.location.reload();
  };

  // const handleUpload = async (e) => {
  //   e.preventDefault();
  //   const formData = new FormData();
  //   formData.append("file", e.target.docxFile.files[0]);
  //   formData.append("subjectCode", e.target.subjectCode.value);

  //   try {
  //     const res = await fetch(`${API_BASE}/upload-questions`, {
  //       method: "POST",
  //       headers: {
  //         Authorization: `Bearer ${localStorage.getItem("token")}`,
  //       },
  //       body: formData,
  //     });

  //     const result = await res.json();
  //     alert(result.message || "Test yükləndi.");
  //   } catch (err) {
  //     alert("Xəta baş verdi.");
  //     console.error(err);
  //   }
  // };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Admin Panel</h2>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 cursor-pointer"
        >
          Çıxış
        </button>
      </div>

      {/* <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Test Yüklə (.docx)</h3>
        <form onSubmit={handleUpload} className="flex items-center gap-4">
          <input
            type="file"
            name="docxFile"
            accept=".docx"
            required
            className="border p-2 rounded"
          />
          <input
            type="text"
            name="subjectCode"
            placeholder="Fənn kodu"
            required
            className="border p-2 rounded"
          />
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Yüklə
          </button>
        </form>
      </div> */}

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
                      {String(Math.floor(student.timeLeft / 60)).padStart(
                        2,
                        "0"
                      )}
                      :{String(student.timeLeft % 60).padStart(2, "0")}:
                      {String(
                        Math.floor((student.timeLeft * 60) % 60)
                      ).padStart(2, "0")}
                    </td>
                    <td className="p-4 text-gray-800">{student.bonusTime}</td>
                    <td className="p-4">
                      <div className="flex gap-3">
                        <button
                          onClick={() =>
                            handleForceSubmit(student.id, student.subjectCode)
                          }
                          className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200"
                        >
                          İmtahanı Bitir
                        </button>
                        <button
                          onClick={() => {
                            const minutes = prompt(
                              "Neçə dəqiqə əlavə etmək istəyirsiniz?"
                            );
                            if (minutes)
                              handleAddTime(
                                student.id,
                                student.subjectCode,
                                parseInt(minutes)
                              );
                          }}
                          className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200"
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
    </div>
  );
};

export default AdminDashboard;
