const Popup = ({ score, preExam, onClose }) => {
  const finalScore = Number(score) + Number(preExam || 0);

  const getLetterGrade = (score) => {
    if (score >= 91 && score <= 100) return "A";
    if (score >= 81 && score <= 90) return "B";
    if (score >= 71 && score <= 80) return "C";
    if (score >= 61 && score <= 70) return "D";
    if (score >= 51 && score <= 60) return "E";
    return "F";
  };

  const letterGrade = getLetterGrade(finalScore);
  const isPassing = letterGrade !== "F";

  return (
    <div className="fixed inset-0 flex items-center justify-center backdrop-blur-2xl bg-opacity-50">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md text-center transform transition-all duration-300 scale-100">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">İmtahan Bitdi</h2>
        <div className="space-y-4">
          <p className="text-lg text-gray-700">
            İmtahan balı:{" "}
            <span className="font-semibold text-indigo-600">{score}</span>
          </p>
          <p className="text-lg text-gray-700">
            Giriş balı:{" "}
            <span className="font-semibold text-indigo-600">
              {preExam || 0}
            </span>
          </p>
          <p className="text-lg text-gray-700">
            Yekun bal:{" "}
            <span className="font-semibold text-indigo-600">{finalScore}</span>
          </p>
          <p className="text-lg text-gray-700">
            Qiymət:{" "}
            <span
              className={`font-semibold ${
                isPassing ? "text-green-600" : "text-red-600"
              }`}
            >
              {letterGrade}
            </span>
          </p>
          {!isPassing && (
            <p className="text-red-600 font-medium">
              Təəssüf ki, imtahandan kəsildiniz
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-6 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 cursor-pointer"
        >
          Bağla
        </button>
      </div>
    </div>
  );
};

export default Popup;
