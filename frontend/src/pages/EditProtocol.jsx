import React, { useEffect, useState } from "react";
import API_BASE from "../config/api";
import { useParams } from "react-router-dom";

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
  const [protocolData, setProtocolData] = useState([]);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    }
    fetchData();
  }, [fennQrupu]);

  if (loading) return <div>Yüklənir...</div>;

  return (
    <div className="font-[Times_New_Roman] m-5">
      <h2 className="text-center font-bold text-lg">
        Bakı Avrasiya Universiteti
      </h2>
      <h3 className="text-center underline font-semibold text-base mb-2">
        MÜVƏFFƏQİYYƏT VƏRƏQİ
      </h3>

      <table className="w-full border-collapse mt-5">
        <tbody>
          <tr>
            <td
              className="border border-black p-1 text-center"
              style={{ width: "15%" }}
            >
              Fənn: {protocolData[0]["Fənnin kodu"]}
            </td>
            <td
              className="border border-black p-1 text-center"
              style={{ width: "10%" }}
            >
              {protocolData[0]["Fənnin adı"]}
            </td>
          </tr>
          <tr>
            <td className="border border-black p-1 text-center">
              Fənn qrupu: {protocolData[0]["fenn_qrupu"]}
            </td>
            <td className="border border-black p-1 text-center"></td>
            <td className="border border-black p-1 text-center" colSpan={2}>
              Tədris ili: 2024 / 2025
            </td>
          </tr>
          <tr>
            <td
              className="border border-black p-1 text-center"
              colSpan={3}
            ></td>
            <td className="border border-black p-1 text-center" colSpan={2}>
              Semestr: Yaz
            </td>
          </tr>
          <tr>
            <td className="border border-black p-1 text-center" colSpan={5}>
              Tarix: "_____" ________________ 2025-ci il
            </td>
          </tr>
        </tbody>
      </table>

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
          {protocolData.map((student, idx) => {
            const scoreParts = splitScore(student.score);
            return (
              <tr key={student.Tələbə_kodu}>
                <td className="border border-black p-1 text-center">
                  {idx + 1}
                </td>
                <td className="border border-black p-1 text-center">
                  {student.Tələbə_kodu}
                </td>
                <td className="border border-black p-1 text-center">
                  {student["Soyadı, adı və ata adı"]}
                </td>
                <td className="border border-black p-1 text-center">EP</td>
                <td className="border border-black p-1 text-center">
                  {student["Pre-Exam"]}
                </td>
                <td className="border border-black p-1 text-center">
                  {student["Qaib"]}
                </td>
                {scoreParts.map((part, i) => (
                  <td key={i} className="border border-black p-1 text-center">
                    {part}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-8 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(250px,1fr))]">
        {["Dekan", "Müəllim", "Baş mühasib", "Nəzarətçi 1", "Nəzarətçi 2"].map(
          (role, idx) => (
            <div key={idx}>
              <strong>{role}:</strong>
              <div>(kod) (ad) (imza)</div>
            </div>
          )
        )}
      </div>

      <div className="mt-8 text-sm">
        <strong>Qeyd:</strong>
        <br />
        <strong>İştirak parametrinin kodları:</strong>
        <ul className="list-disc list-inside">
          <li>10 - Təhsilalanın imtahanda iştirakını</li>
          <li>20 - Təhsilalanın imtahana gəlməməsini</li>
          <li>21 - Üzrlü</li>
          <li>22 - Üzrsüz</li>
          <li>30 - Təhsilalanın imtahana buraxılmamasını</li>
          <li>31 - 20%-dən çox dərs buraxdığına görə</li>
          <li>32 - Təhsil haqqına görə</li>
          <li>34 - Kurs işinin nəticəsinə görə</li>
        </ul>
      </div>
    </div>
  );
};

export default EditProtocol;
