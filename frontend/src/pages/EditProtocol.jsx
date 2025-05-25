import React, { useEffect, useState, useRef } from "react";
import API_BASE from "../config/api";
import { useParams, useNavigate } from "react-router-dom";
// You need to install html2pdf.js: npm install html2pdf.js
import html2pdf from "html2pdf.js";

function splitScore(score) {
  // Split score into 5 parts, each max 10
  let parts = [];
  let remaining = Number(score);
  for (let i = 0; i < 5; i++) {
    if (remaining >= 10) {
      parts.push(10);
      remaining -= 10;
    } else if (remaining > 0) {
      parts.push(remaining);
      remaining = 0;
    } else {
      parts.push("");
    }
  }
  return parts;
}

const EditProtocol = () => {
  const { fennQrupu } = useParams();
  const navigate = useNavigate();
  const [protocolData, setProtocolData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editedData, setEditedData] = useState([]);
  const pageRef = useRef();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
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
      setEditedData(data.map((student) => ({ ...student })));
      setLoading(false);
    }
    fetchData();
  }, [fennQrupu]);

  const handleInputChange = (idx, field, value) => {
    setEditedData((prev) => {
      const updated = [...prev];
      updated[idx][field] = value;
      return updated;
    });
  };

  const handleScorePartChange = (studentIdx, partIdx, value) => {
    setEditedData((prev) => {
      const updated = [...prev];
      const scoreParts = splitScore(updated[studentIdx].score);
      scoreParts[partIdx] = value === "" ? "" : Number(value);
      // Recalculate total score
      updated[studentIdx].score = scoreParts.reduce(
        (a, b) => Number(a) + Number(b || 0),
        0
      );
      return updated;
    });
  };

  const handleDownloadPDF = (fennQrupu) => {
    if (pageRef.current) {
      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5], // top, left, bottom, right in inches
        filename: `${fennQrupu}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
      };
      html2pdf().set(opt).from(pageRef.current).save();
    }
  };

  if (loading) return <div>Yüklənir...</div>;

  return (
    <div className="font-[Times_New_Roman] m-5">
      <div className="flex gap-4 mb-4">
        <button
          className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 cursor-pointer"
          onClick={() => {
            if (
              protocolData &&
              protocolData.length > 0 &&
              protocolData[0].fenn_qrupu
            ) {
              handleDownloadPDF(protocolData[0].fenn_qrupu);
            } else {
              alert("Məlumatlar yüklənməyib. Zəhmət olmasa gözləyin.");
            }
          }}
        >
          PDF Yüklə
        </button>
        <button
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 cursor-pointer"
          onClick={() => {
            console.log("protocolData:", protocolData); // Debug
            console.log("fenn_qrupu:", protocolData[0]?.fenn_qrupu); // Debug
            if (
              protocolData &&
              protocolData.length > 0 &&
              protocolData[0].fenn_qrupu
            ) {
              const targetUrl = `/admin/export-protocol/${encodeURIComponent(
                protocolData[0].fenn_qrupu
              )}`;
              console.log("Navigating to:", targetUrl);
              navigate(targetUrl);
            } else {
              alert("Məlumatlar yüklənməyib. Zəhmət olmasa gözləyin.");
            }
          }}
        >
          Excel-ə Export Et
        </button>
      </div>
      <div ref={pageRef}>
        <h2 className="text-center font-bold text-lg">
          Bakı Avrasiya Universiteti
        </h2>
        <h3 className="text-center font-semibold text-base mb-6">
          MÜVƏFFƏQİYYƏT VƏRƏQİ
        </h3>

        {/* Borderless header section */}
        <div className="flex flex-row mb-2 w-[50%] justify-between">
          <div>
            <span className="font-semibold">Fənn:</span>{" "}
            <span className="font-semibold underline">
              {protocolData[0]?.["Fənnin kodu"]}
            </span>
          </div>
          <div>
            <span className="font-semibold underline">
              {protocolData[0]?.["Fənnin adı"]}
            </span>
          </div>
        </div>

        <div className="flex flex-row gap-8 mb-2 justify-between">
          <div>
            <span className="font-semibold">Fənn qrupu:</span>{" "}
            <span className="font-semibold underline">
              {protocolData[0]?.["fenn_qrupu"]}
            </span>
          </div>
          <div>
            <span className="font-semibold">Tədris ili: 2024 / 2025</span>
          </div>
        </div>

        <div className="flex flex-row justify-between mb-2 pl-4">
          <div>
            <span className="font-semibold">Tarix:</span> "______"
            ________________ 2025
          </div>
          <div>
            <span className="font-semibold">Semestr: YAZ</span>
          </div>
        </div>

        <table className="w-full border-collapse mt-5">
          <thead>
            <tr>
              <th rowSpan={2} className="border border-black p-1 text-center">
                Sıra №
              </th>
              <th colSpan={2} className="border border-black p-1 text-center">
                T ə h s i l a l a n
              </th>
              <th rowSpan={2} className="border border-black p-1 text-center">
                İştirak parametri
              </th>
              <th colSpan={2} className="border border-black p-1 text-center">
                İ.q.g.
              </th>
              <th colSpan={5} className="border border-black p-1 text-center">
                Nəticə
              </th>
            </tr>
            <tr>
              <th className="border border-black p-1 text-center">Kod</th>
              <th className="border border-black p-1 text-center">S.A.A.</th>
              <th className="border border-black p-1 text-center">CQN</th>
              <th className="border border-black p-1 text-center">Qaib</th>
              {[1, 2, 3, 4, 5].map((n) => (
                <th key={n} className="border border-black p-1 text-center">
                  {n}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {editedData.map((student, idx) => {
              const scoreParts = splitScore(student.score);
              return (
                <tr key={student.Tələbə_kodu}>
                  <td className="border border-black p-1 text-center">
                    {idx + 1}
                  </td>
                  <td className="border border-black p-1 text-center">
                    <input
                      className="w-full text-center bg-transparent"
                      value={student.Tələbə_kodu}
                      onChange={(e) =>
                        handleInputChange(idx, "Tələbə_kodu", e.target.value)
                      }
                    />
                  </td>
                  <td className="border border-black p-1 text-center">
                    <input
                      className="w-full text-center bg-transparent"
                      value={student["Soyadı, adı və ata adı"]}
                      onChange={(e) =>
                        handleInputChange(
                          idx,
                          "Soyadı, adı və ata adı",
                          e.target.value
                        )
                      }
                    />
                  </td>
                  <td className="border border-black p-1 text-center">
                    <input
                      className="w-full text-center bg-transparent"
                      value={student["EP"] || ""}
                      onChange={(e) =>
                        handleInputChange(idx, "EP", e.target.value)
                      }
                    />
                  </td>
                  <td className="border border-black p-1 text-center">
                    <input
                      className="w-full text-center bg-transparent"
                      value={student["Pre-Exam"]}
                      onChange={(e) =>
                        handleInputChange(idx, "Pre-Exam", e.target.value)
                      }
                    />
                  </td>
                  <td className="border border-black p-1 text-center">
                    <input
                      className="w-full text-center bg-transparent"
                      value={student["Qaib"]}
                      onChange={(e) =>
                        handleInputChange(idx, "Qaib", e.target.value)
                      }
                    />
                  </td>
                  {scoreParts.map((part, i) => (
                    <td key={i} className="border border-black p-1 text-center">
                      <input
                        className="w-full text-center bg-transparent"
                        value={part}
                        onChange={(e) =>
                          handleScorePartChange(idx, i, e.target.value)
                        }
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Signature section formatted horizontally */}
        <div className="mt-8 flex flex-row justify-between w-[80%] mx-auto">
          {/* Left side: Dekan and Baş mühasib */}
          <div className="flex flex-col gap-8">
            {["Dekan", "Baş mühasib"].map((role, idx) => (
              <div key={idx} className="flex flex-col items-start">
                <div className="flex flex-row items-center gap-2">
                  <span className="font-semibold">{role}:</span>
                  <span className="inline-block w-48 border-b border-black align-middle text-white">
                    Test
                  </span>
                </div>
                <div className="flex flex-row justify-between w-48 mt-1 ml-10 text-xs">
                  <span className="w-1/3 text-center">(kod)</span>
                  <span className="w-1/3 text-center">(ad)</span>
                  <span className="w-1/3 text-center">(imza)</span>
                </div>
              </div>
            ))}
          </div>
          {/* Right side: Müəllim, Nəzarətçi 1, Nəzarətçi 2 */}
          <div className="flex flex-col gap-8 items-end">
            {["Müəllim", "Nəzarətçi 1", "Nəzarətçi 2"].map((role, idx) => (
              <div key={idx} className="flex flex-col items-end">
                <div className="flex flex-row items-center gap-2">
                  <span className="font-semibold">{role}:</span>
                  <span className="inline-block w-48 border-b border-black align-middle text-white">
                    Test
                  </span>
                </div>
                <div className="flex flex-row justify-between w-48 mt-1 ml-10 text-xs">
                  <span className="w-1/3 text-center">(kod)</span>
                  <span className="w-1/3 text-center">(ad)</span>
                  <span className="w-1/3 text-center">(imza)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-sm">
          <strong>Qeyd:</strong>
          <br />
          <strong>İştirak parametrinin kodları:</strong>
          <div className="flex flex-row gap-8">
            <ul className="list-none list-inside">
              <li>10 - Təhsilalanın imtahanda iştirakını</li>
              <li>20 - Təhsilalanın imtahana gəlməməsini</li>
              <li>21 - Üzrlü</li>
              <li>22 - Üzrsüz</li>
            </ul>
            <ul>
              <li>30 - Təhsilalanın imtahana buraxılmamasını</li>
              <li>31 - 20%-dən çox dərs buraxdığına görə</li>
              <li>32 - Təhsil haqqına görə</li>
              <li>34 - Kurs işinin nəticəsinə görə</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProtocol;
