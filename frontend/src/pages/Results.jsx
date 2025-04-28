import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDate } from "../utils/dateFormatter";
import API_BASE from "../config/api";

const Results = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const studentId = localStorage.getItem("studentId"); // Get student ID

  useEffect(() => {
    fetch(`${API_BASE}/results/${studentId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setResults(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [studentId]);

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-2xl mb-4 montserrat montserrat-700">
        İmtahanların nəticələri:
      </h2>

      {loading ? (
        <p>Yüklənir...</p>
      ) : results.length === 0 ? (
        <p className="text-xl">Heç bir nəticə tapılmadı.</p>
      ) : (
        <>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-blue-300">
                <th className="border p-3 text-left">Fənn</th>
                <th className="border p-3 text-left">Başlama vaxtı</th>
                <th className="border p-3 text-left">Bitmə vaxtı</th>
                <th className="border p-3 text-left">Bal</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr key={index} className="hover:bg-blue-100">
                  <td className="border p-3">{result["Fənnin adı"]}</td>
                  <td className="border p-3">
                    {formatDate(result["created_at"], "dd/MM/yyyy HH:mm:ss")}
                  </td>
                  <td className="border p-3">
                    {formatDate(result["submitted_at"], "dd/MM/yyyy HH:mm:ss")}
                  </td>
                  <td className="border p-3">
                    <div className="flex space-x-[30px] items-center">
                      <span>{result["score"]}</span>
                      <Link
                        to={`/review/${result["Fənnin kodu"]}`}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                      >
                        Baxış
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default Results;
