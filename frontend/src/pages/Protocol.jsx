import { useState } from "react";
import API_BASE from "../config/api";

const Protocol = () => {
  const [fennQrupu, setFennQrupu] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResults([]);

    try {
      // URL encode the fenn_qrupu to handle the slash
      const encodedFennQrupu = encodeURIComponent(fennQrupu);
      const response = await fetch(
        `${API_BASE}/results/group/${encodedFennQrupu}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch results");
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Protokol</h2>

      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <form onSubmit={handleSubmit} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-gray-700 font-medium mb-2">
              Fənn Qrupu
            </label>
            <input
              type="text"
              value={fennQrupu}
              onChange={(e) => setFennQrupu(e.target.value)}
              placeholder="Məsələn: Eko104401/121"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Yüklənir..." : "Axtar"}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-indigo-600 text-white">
                  <th className="p-4 text-left">Ad Soyad</th>
                  <th className="p-4 text-left">Fənn</th>
                  <th className="p-4 text-left">Bal</th>
                  <th className="p-4 text-left">Ümumi Suallar</th>
                  <th className="p-4 text-left">Tarix</th>
                  <th className="p-4 text-left">Akademik Qrup</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr
                    key={result.id}
                    className="border-b border-gray-200 hover:bg-indigo-50"
                  >
                    <td className="p-4">{result["Soyadı, adı və ata adı"]}</td>
                    <td className="p-4">{result["Fənnin adı"]}</td>
                    <td className="p-4">{result.score}</td>
                    <td className="p-4">{result.total_questions}</td>
                    <td className="p-4">
                      {new Date(result.submitted_at).toLocaleString()}
                    </td>
                    <td className="p-4">{result["Akademik qrup"]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Protocol;
