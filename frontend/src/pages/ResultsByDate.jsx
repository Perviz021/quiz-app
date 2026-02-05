import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../config/api";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

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

  const downloadExcel = () => {
    if (results.length === 0) {
      toast.warning("Yüklənəcək nəticə yoxdur");
      return;
    }

    try {
      // Map the results data to match table headers
      const excelData = results.map((result) => ({
        "Tələbə Kodu": result["Tələbə_kodu"],
        "Ad Soyad": result["Soyadı, adı və ata adı"],
        "Akademik Qrup": result["Akademik qrup"] || "-",
        Fənn: result["Fənnin adı"],
        "Fənnin Kodu": result["Fənnin kodu"],
        "Fənn Qrupu": result.fenn_qrupu || "-",
        Bal: result.score,
        "Başlama Vaxtı": formatDateTime(result.created_at),
        "Bitmə Vaxtı": formatDateTime(result.submitted_at),
      }));

      // Create a new workbook
      const wb = XLSX.utils.book_new();

      // Convert data to worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths for better readability
      const colWidths = [
        { wch: 15 }, // Tələbə Kodu
        { wch: 30 }, // Ad Soyad
        { wch: 15 }, // Akademik Qrup
        { wch: 30 }, // Fənn
        { wch: 15 }, // Fənnin Kodu
        { wch: 15 }, // Fənn Qrupu
        { wch: 10 }, // Bal
        { wch: 25 }, // Başlama Vaxtı
        { wch: 25 }, // Bitmə Vaxtı
      ];
      ws["!cols"] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Nəticələr");

      // Generate filename with date
      const formattedDate = selectedDate.replace(/-/g, "_");
      const filename = `imtahan_neticeleri_${formattedDate}.xlsx`;

      // Write file and trigger download
      XLSX.writeFile(wb, filename);

      toast.success("Excel faylı uğurla yükləndi!");
    } catch (error) {
      console.error("Error generating Excel file:", error);
      toast.error(`Excel faylını yaratmaq mümkün olmadı: ${error.message}`);
    }
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
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Tarix: {selectedDate}
              </span>
              <button
                onClick={downloadExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 cursor-pointer flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Excel-ə Yüklə
              </button>
            </div>
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
                  <th className="p-4 text-left font-semibold">Başlama Vaxtı</th>
                  <th className="p-4 text-left font-semibold">Bitmə Vaxtı</th>
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
                      {formatDateTime(result.created_at)}
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
