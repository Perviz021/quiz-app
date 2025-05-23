import { useState } from "react";
import API_BASE from "../config/api";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const Protocol = () => {
  const [fennQrupu, setFennQrupu] = useState("");
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [day, month, year] = dateStr.split("/");
    return `${day}.${month}.${year}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setGroups([]);

    try {
      const encodedFennQrupu = encodeURIComponent(fennQrupu);
      const response = await fetch(
        `${API_BASE}/results/groups/${encodedFennQrupu}`,
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
      if (data.length === 0) {
        toast.error("Bu fənn qrupu üzrə nəticə tapılmadı!");
      }
      setGroups(data);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (fennQrupu) => {
    navigate(`/edit-protocol/${encodeURIComponent(fennQrupu)}`);
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
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

      {groups.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-indigo-600 text-white">
                  <th className="p-4 text-left">Fənn Qrupu</th>
                  <th className="p-4 text-left">Fənn</th>
                  <th className="p-4 text-left">Professor</th>
                  <th className="p-4 text-left">İmtahan Tarixi</th>
                  <th className="p-4 text-left">Əməliyyatlar</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr
                    key={group.fenn_qrupu}
                    className="border-b border-gray-200 hover:bg-indigo-50"
                  >
                    <td className="p-4">{group.fenn_qrupu}</td>
                    <td className="p-4">{group["Fənnin adı"]}</td>
                    <td className="p-4">{group.Professor}</td>
                    <td className="p-4">{formatDate(group.Exam_date)}</td>
                    <td className="p-4">
                      <button
                        onClick={() => handleEdit(group.fenn_qrupu)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 cursor-pointer"
                      >
                        Baxış
                      </button>
                    </td>
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
