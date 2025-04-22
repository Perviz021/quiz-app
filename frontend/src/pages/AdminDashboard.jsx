import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://192.168.11.78:5000/api";

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

  const handleForceSubmit = (studentId) => {
    fetch(`${API_BASE}/force-submit/${studentId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }).then(() => {
      alert("Exam stopped for student.");
      setActiveStudents((prev) =>
        prev.filter((student) => student.id !== studentId)
      );
    });
  };

  const handleAddTime = (studentId, minutes) => {
    fetch(`${API_BASE}/extend-time/${studentId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ minutes }),
    }).then(() => alert("Time extended!"));
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
    window.location.reload();
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("file", e.target.docxFile.files[0]);
    formData.append("subjectCode", e.target.subjectCode.value);

    try {
      const res = await fetch(`${API_BASE}/upload-questions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      const result = await res.json();
      alert(result.message || "Test yükləndi.");
    } catch (err) {
      alert("Xəta baş verdi.");
      console.error(err);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Admin Panel</h2>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 cursor-pointer"
        >
          Çıxış
        </button>
      </div>

      <div className="mb-6">
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
      </div>

      <h3 className="text-xl font-semibold mb-2">
        Aktiv imtahanda olan tələbələr:
      </h3>
      {activeStudents?.length === 0 ? (
        <p>No active students currently.</p>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Ad Soyad</th>
              <th className="border p-2">Fənn</th>
              <th className="border p-2">Vaxt qalıb</th>
              <th className="border p-2">Əməliyyat</th>
            </tr>
          </thead>
          <tbody>
            {activeStudents?.map((student) => (
              <tr key={student.id}>
                <td className="border p-2">{student.name}</td>
                <td className="border p-2">{student.subject}</td>
                <td className="border p-2">{student.timeLeft} dəq</td>
                <td className="border p-2 flex gap-2">
                  <button
                    onClick={() => handleForceSubmit(student.id)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    İmtahanı bitir
                  </button>
                  <button
                    onClick={() => {
                      const minutes = prompt(
                        "Neçə dəqiqə əlavə etmək istəyirsiniz?"
                      );
                      if (minutes) handleAddTime(student.id, parseInt(minutes));
                    }}
                    className="bg-blue-500 text-white px-2 py-1 rounded"
                  >
                    Vaxt əlavə et
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminDashboard;
