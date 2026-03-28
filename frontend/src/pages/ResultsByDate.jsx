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

  const fieldLabel =
    "block text-[11px] font-bold text-slate-500 uppercase tracking-wider montserrat mb-1.5";
  const fieldInput =
    "w-full p-3 border border-border rounded-lg text-sm inter focus:ring-2 focus:ring-navy/25 focus:border-navy outline-none transition-all bg-slate-50 focus:bg-white";

  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-navy-mid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-gold-light text-[11px] font-semibold tracking-widest uppercase montserrat mb-1">
            Admin · Hesabat
          </p>
          <h1 className="text-white text-2xl sm:text-3xl font-bold montserrat-700 leading-tight">
            Tarixə görə{" "}
            <span className="text-gold-light">imtahan nəticələri</span>
          </h1>
          <p className="text-slate-300 text-sm inter mt-1 max-w-2xl">
            Tarix seçərək həmin gün təqdim edilmiş imtahan nəticələrini görə
            bilərsiniz.
          </p>
        </div>
        <svg
          viewBox="0 0 1440 24"
          className="w-full block"
          preserveAspectRatio="none"
          style={{ height: "24px" }}
        >
          <path
            d="M0,24 C360,0 1080,0 1440,24 L1440,24 L0,24 Z"
            fill="var(--color-surface, #f4f6fa)"
          />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 md:items-end">
            <div className="flex-1">
              <label className={fieldLabel}>Tarix seçin</label>
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                max={getTodayDate()}
                className={fieldInput}
              />
            </div>
            <button
              onClick={fetchResults}
              disabled={loading || !selectedDate}
              className={`px-6 py-3 rounded-lg text-sm font-bold transition-all duration-200 montserrat-700 focus:outline-none focus:ring-2 focus:ring-offset-2 shrink-0 ${
                loading || !selectedDate
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-navy hover:bg-navy-light text-white cursor-pointer focus:ring-navy/40"
              }`}
            >
              {loading ? "Yüklənir..." : "Nəticələri göstər"}
            </button>
          </div>
        </div>

        {results.length > 0 && (
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/80">
              <div>
                <h3 className="text-lg font-bold text-navy montserrat-700">
                  Nəticələr{" "}
                  <span className="text-gold">({results.length})</span>
                </h3>
                <p className="text-sm text-slate-600 inter mt-0.5">
                  Tarix:{" "}
                  <span className="font-semibold text-navy">{selectedDate}</span>
                </p>
              </div>
              <button
                onClick={downloadExcel}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-2 cursor-pointer montserrat-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 shrink-0"
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
                Excel-ə yüklə
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-navy text-white">
                    <th className="p-3 sm:p-4 text-left font-bold montserrat text-[11px] uppercase tracking-wider">
                      Tələbə kodu
                    </th>
                    <th className="p-3 sm:p-4 text-left font-bold montserrat text-[11px] uppercase tracking-wider">
                      Ad soyad
                    </th>
                    <th className="p-3 sm:p-4 text-left font-bold montserrat text-[11px] uppercase tracking-wider">
                      Akademik qrup
                    </th>
                    <th className="p-3 sm:p-4 text-left font-bold montserrat text-[11px] uppercase tracking-wider">
                      Fənn
                    </th>
                    <th className="p-3 sm:p-4 text-left font-bold montserrat text-[11px] uppercase tracking-wider">
                      Fənnin kodu
                    </th>
                    <th className="p-3 sm:p-4 text-left font-bold montserrat text-[11px] uppercase tracking-wider">
                      Fənn qrupu
                    </th>
                    <th className="p-3 sm:p-4 text-left font-bold montserrat text-[11px] uppercase tracking-wider">
                      Bal
                    </th>
                    <th className="p-3 sm:p-4 text-left font-bold montserrat text-[11px] uppercase tracking-wider">
                      Başlama
                    </th>
                    <th className="p-3 sm:p-4 text-left font-bold montserrat text-[11px] uppercase tracking-wider">
                      Bitmə
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.map((result) => (
                    <tr
                      key={result.id}
                      className="hover:bg-slate-50/90 transition-colors inter"
                    >
                      <td className="p-3 sm:p-4 text-slate-800">
                        {result["Tələbə_kodu"]}
                      </td>
                      <td className="p-3 sm:p-4 text-slate-800">
                        {result["Soyadı, adı və ata adı"]}
                      </td>
                      <td className="p-3 sm:p-4 text-slate-800">
                        {result["Akademik qrup"] || "-"}
                      </td>
                      <td className="p-3 sm:p-4 text-slate-800">
                        {result["Fənnin adı"]}
                      </td>
                      <td className="p-3 sm:p-4 text-slate-800">
                        {result["Fənnin kodu"]}
                      </td>
                      <td className="p-3 sm:p-4 text-slate-900 font-semibold">
                        {result.fenn_qrupu}
                      </td>
                      <td className="p-3 sm:p-4 text-navy font-bold">
                        {result.score}
                      </td>
                      <td className="p-3 sm:p-4 text-slate-700 whitespace-nowrap">
                        {formatDateTime(result.created_at)}
                      </td>
                      <td className="p-3 sm:p-4 text-slate-700 whitespace-nowrap">
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
          <div className="bg-white rounded-2xl border border-border shadow-sm p-10 text-center">
            <p className="text-slate-600 text-lg montserrat-600">
              Seçilmiş tarixdə nəticə tapılmadı.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsByDate;
