import React from "react";

const EditProtocol = () => {
  return (
    <div className="font-[Times_New_Roman] m-5">
      <h2 className="text-center">Bakı Avrasiya Universiteti</h2>
      <h3 className="text-center underline">MÜVƏFFƏQİYYƏT VƏRƏQİ</h3>

      <table className="w-full border-collapse mt-5">
        <tbody>
          <tr>
            <td className="border border-black p-1 text-center">Fənn:</td>
            <td className="border border-black p-1 text-center">Fənnin kodu</td>
            <td className="border border-black p-1 text-center">FA</td>
            <td className="border border-black p-1 text-center"></td>
          </tr>
          <tr>
            <td className="border border-black p-1 text-center">(kod)</td>
            <td className="border border-black p-1 text-center"></td>
            <td className="border border-black p-1 text-center">(ad)</td>
          </tr>
          <tr>
            <td className="border border-black p-1 text-center">Fənn qrupu:</td>
            <td className="border border-black p-1 text-center">Stable</td>
            <td className="border border-black p-1 text-center"></td>
            <td className="border border-black p-1 text-center">
              Tədris ili: 2024 / 2025
            </td>
          </tr>
          <tr>
            <td className="border border-black p-1 text-center">(kod)</td>
            <td className="border border-black p-1 text-center"></td>
            <td className="border border-black p-1 text-center"></td>
            <td className="border border-black p-1 text-center">
              Semestr: Yaz
            </td>
          </tr>
          <tr>
            <td colSpan="4" className="border border-black p-1 text-center">
              Tarix: "_____" ________________ 2025-ci il
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse mt-5">
        <thead>
          <tr>
            {[
              "Sıra №",
              "T ə h s i l a l a n",
              "",
              "İştirak parametri",
              "İ.q.g.",
              "",
              "Nəticə",
              "",
              "",
              "",
              "",
            ].map((text, idx) => (
              <th
                key={idx}
                className="border border-black p-1 text-center"
                colSpan={
                  text === "T ə h s i l a l a n" ||
                  text === "İ.q.g." ||
                  text === "Nəticə"
                    ? 2
                    : 1
                }
              >
                {text}
              </th>
            ))}
          </tr>
          <tr>
            {[
              "",
              "Kod",
              "S.A.A.",
              "",
              "CQN",
              "Qaib",
              "1",
              "2",
              "3",
              "4",
              "5",
            ].map((text, idx) => (
              <th key={idx} className="border border-black p-1 text-center">
                {text}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-1 text-center">1</td>
            <td className="border border-black p-1 text-center">Tələbə_kodu</td>
            <td className="border border-black p-1 text-center">
              Student Tabledan Tələbə adı
            </td>
            <td className="border border-black p-1 text-center">EP</td>
            <td className="border border-black p-1 text-center">Pre-Exam</td>
            <td className="border border-black p-1 text-center">Qaib</td>
            {[...Array(5)].map((_, i) => (
              <td key={i} className="border border-black p-1 text-center"></td>
            ))}
          </tr>
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
