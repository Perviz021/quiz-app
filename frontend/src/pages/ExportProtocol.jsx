import React, { useState, useEffect } from "react";
import API_BASE from "../config/api";
import { useParams } from "react-router-dom";

const ExportProtocol = () => {
  const { fennQrupu } = useParams();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [protocolData, setProtocolData] = useState([]);

  useEffect(() => {
    fetchData();
  }, [fennQrupu]);

  const fetchData = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/results/group/${encodeURIComponent(fennQrupu)}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await res.json();
      setProtocolData(data);
      setLoading(false);
    } catch (error) {
      setMessage(`Error fetching data: ${error.message}`);
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      if (!protocolData || protocolData.length === 0) {
        setMessage("No data to export.");
        return;
      }

      // Prepare data to send to backend Python script
      const dataToSend = {
        fenn_kodu: protocolData[0]["Fənnin kodu"],
        fenn_adi: protocolData[0]["Fənnin adı"],
        fenn_qrupu: protocolData[0].fenn_qrupu,
        // Add other header fields if needed by the Python script
        // academic_year: '2024 / 2025', // Example static data
        // semester: 'YAZ', // Example static data
        students: protocolData.map((student) => ({
          Tələbə_kodu: student["Tələbə_kodu"],
          "Soyadı, adı və ata adı": student["Soyadı, adı və ata adı"],
          EP: student["EP"],
          "Pre-Exam": student["Pre-Exam"],
          Qaib: student["Qaib"],
          score: student["score"],
        })),
      };

      setLoading(true);
      setMessage("Generating Excel...");

      const response = await fetch(`${API_BASE}/results/export-excel-python`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error: ${response.status} - ${errorText}`);
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "protocol.xlsx"; // Default filename
      if (
        contentDisposition &&
        contentDisposition.indexOf("attachment") !== -1
      ) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?;/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      // Get the blob and create a download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      a.remove();

      setMessage("Excel file generated successfully!");
    } catch (error) {
      console.error("Error generating Excel:", error);
      setMessage(`Error generating Excel file: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // splitScoreWithZero helper is no longer needed in frontend

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-5">
      <h2 className="text-2xl font-bold mb-4">Export Protocol Data</h2>

      <div className="mb-4">
        <button
          onClick={exportToExcel}
          className={`px-4 py-2 rounded ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600 text-white"
          }`}
          disabled={loading}
        >
          {loading ? "Generating..." : "Export to Excel"}
        </button>
      </div>

      {message && (
        <div
          className={`mt-4 p-3 rounded ${
            message.includes("Error")
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
};

export default ExportProtocol;
