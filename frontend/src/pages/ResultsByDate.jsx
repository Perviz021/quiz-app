import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../config/api";
import { toast } from "react-toastify";

const ResultsByDate = () => {
  const [selectedDate, setSelectedDate] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const status = localStorage.getItem("status");

  // Check if user is staff
  useEffect(() => {
    if (status !== "staff") {
      toast.error("Bu səhifəyə yalnız staff üzvləri daxil ola bilər");
      navigate("/admin");
    }
  }, [status, navigate]);

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const fetchResults = async () => {
    if (!selectedDate) {
      toast.warning("Zəhmət olmasa tarix seçin");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/results/by-date/${selectedDate}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nəticələri yükləmək mümkün olmadı");
      }

      setResults(data);
      if (data.length === 0) {
        toast.info("Seçilmiş tarixdə nəticə tapılmadı");
      } else {
        toast.success(`${data.length} nəticə tapıldı`);
      }
    } catch (error) {
      console.error("Error fetching results:", error);
      toast.error(`Xəta: ${error.message}`);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("az-AZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  if (status !== "staff") {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Tarixə görə İmtahan Nəticələri
        </h2>
        <p className="text-gray-600">
          Tarix seçərək həmin gün təqdim edilmiş imtahan nəticələrini görə
          bilərsiniz.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tarix Seçin
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              max={getTodayDate()}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            onClick={fetchResults}
            disabled={loading || !selectedDate}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
              loading || !selectedDate
                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
            }`}
          >
            {loading ? "Yüklənir..." : "Nəticələri Göstər"}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900">
              Nəticələr ({results.length})
            </h3>
            <span className="text-sm text-gray-600">Tarix: {selectedDate}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-indigo-600 text-white">
                  <th className="p-4 text-left font-semibold">Tələbə Kodu</th>
                  <th className="p-4 text-left font-semibold">Ad Soyad</th>
                  <th className="p-4 text-left font-semibold">Akademik Qrup</th>
                  <th className="p-4 text-left font-semibold">Fənn</th>
                  <th className="p-4 text-left font-semibold">Fənnin Kodu</th>
                  <th className="p-4 text-left font-semibold">Fənn Qrupu</th>
                  <th className="p-4 text-left font-semibold">Bal</th>
                  <th className="p-4 text-left font-semibold">
                    Təqdim Edilmə Vaxtı
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr
                    key={result.id}
                    className="border-b border-gray-200 hover:bg-indigo-50 transition-colors duration-200"
                  >
                    <td className="p-4 text-gray-800">
                      {result["Tələbə_kodu"]}
                    </td>
                    <td className="p-4 text-gray-800">
                      {result["Soyadı, adı və ata adı"]}
                    </td>
                    <td className="p-4 text-gray-800">
                      {result["Akademik qrup"] || "-"}
                    </td>
                    <td className="p-4 text-gray-800">
                      {result["Fənnin adı"]}
                    </td>
                    <td className="p-4 text-gray-800">
                      {result["Fənnin kodu"]}
                    </td>
                    <td className="p-4 text-gray-800 font-semibold">
                      {result.fenn_qrupu}
                    </td>
                    <td className="p-4 text-gray-800 font-semibold">
                      {result.score}
                    </td>
                    <td className="p-4 text-gray-800">
                      {formatDateTime(result.submitted_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {results.length === 0 && !loading && selectedDate && (
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <p className="text-gray-600 text-lg">
            Seçilmiş tarixdə nəticə tapılmadı.
          </p>
        </div>
      )}
    </div>
  );
};

export default ResultsByDate;
