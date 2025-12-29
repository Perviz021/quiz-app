import React from "react";

const ExamRules = ({ acceptedRules, setAcceptedRules, onStartExam }) => {
  return (
    <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-2xl p-8">
      <h2 className="text-3xl font-bold text-center mb-6 text-gray-900">
        İmtahan Qaydaları
      </h2>
      <div className="max-h-80 overflow-y-auto p-4 bg-gray-50 rounded-lg text-gray-700 space-y-3">
        <p>1. Tələbə bileti olmadan imtahana girmək qadağandır.</p>
        <p>
          2. Auditoriyanın sakitliyini pozmaq, yüksək səslə danışmaq qadağandır.
        </p>
        <p>3. Kənar kompüter və masalara baxmaq qadağandır.</p>
        <p>4. Nəzarətçinin təlimatlarına uymamaq qadağandır.</p>
        <p>
          5. İmtahan zamanı qulaqlıq, telefon və digər texniki avadanlıqlardan
          istifadə etmək qadağandır.
        </p>
        <p>
          6. Konspekt, dəftər və digər köməkçi vasitələrdən istifadə etmək
          qadağandır.
        </p>
        <p>7. Stol, stul və divarlara yazı yazmaq qadağandır.</p>
        <p>8. Digər tələbə yoldaşına kömək etmək qadağandır.</p>
        <p>9. Kompüterdə başqa səhifə açmak qadağandır.</p>
      </div>

      <div className="flex items-center mt-6">
        <input
          id="acceptRules"
          type="checkbox"
          checked={acceptedRules}
          onChange={(e) => setAcceptedRules(e.target.checked)}
          className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
        />
        <label
          htmlFor="acceptRules"
          className="ml-2 text-sm text-gray-700 cursor-pointer"
        >
          Qaydaları oxudum və razıyam
        </label>
      </div>

      <button
        onClick={onStartExam}
        disabled={!acceptedRules}
        className={`mt-6 w-full py-3 px-6 rounded-xl text-lg font-semibold transition-all duration-200 ${
          acceptedRules
            ? "bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
            : "bg-gray-400 text-gray-200 cursor-not-allowed"
        }`}
      >
        İmtahana Başla
      </button>
    </div>
  );
};

export default ExamRules;
