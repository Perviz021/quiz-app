import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDate } from "../utils/dateFormatter";
import API_BASE from "../config/api";

const Results = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const studentId = localStorage.getItem("studentId");

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
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">
        İmtahanların Nəticələri
      </h2>

      {loading ? (
        <p className="text-gray-600 text-lg text-center">Yüklənir...</p>
      ) : results.length === 0 ? (
        <p className="text-gray-600 text-lg text-center">
          Heç bir nəticə tapılmadı.
        </p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-2xl shadow-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-indigo-600 text-white">
                <th className="p-4 text-left font-semibold">Fənn</th>
                <th className="p-4 text-left font-semibold">Başlama Vaxtı</th>
                <th className="p-4 text-left font-semibold">Bitmə Vaxtı</th>
                <th className="p-4 text-left font-semibold">Bal</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-200 hover:bg-indigo-50 transition-colors duration-200"
                >
                  <td className="p-4 text-gray-800">{result["Fənnin adı"]}</td>
                  <td className="p-4 text-gray-600">
                    {formatDate(result["created_at"], "dd/MM/yyyy HH:mm:ss")}
                  </td>
                  <td className="p-4 text-gray-600">
                    {formatDate(result["submitted_at"], "dd/MM/yyyy HH:mm:ss")}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-800 font-medium">
                        {result["score"]}
                      </span>
                      <Link
                        to={`/review/${result["Fənnin kodu"]}`}
                        className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200"
                      >
                        Baxış
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Results;
