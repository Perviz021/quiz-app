const Popup = ({ score, preExam, onClose }) => {
  const finalScore = Number(score) + Number(preExam || 0);
  const examScore = Number(score);

  const getLetterGrade = (score) => {
    if (score >= 91 && score <= 100) return "A";
    if (score >= 81 && score <= 90) return "B";
    if (score >= 71 && score <= 80) return "C";
    if (score >= 61 && score <= 70) return "D";
    if (score >= 51 && score <= 60) return "E";
    return "F";
  };

  const letterGrade = getLetterGrade(finalScore);
  const isExamPassing = examScore >= 17;
  const isPassing = isExamPassing && letterGrade !== "F";

  const getMessage = () => {
    if (!isExamPassing) {
      return "Təəssüf ki, imtahandan kəsildiniz. İmtahan balı 17-dən azdır.";
    }
    if (!isPassing) {
      return "Təəssüf ki, imtahandan kəsildiniz. Yekun bal kifayət qədər deyil.";
    }
    switch (letterGrade) {
      case "A":
        return "Təbrik edirik! Əla nəticə göstərdiniz!";
      case "B":
        return "Təbrik edirik! Çox yaxşı nəticə göstərdiniz!";
      case "C":
        return "Təbrik edirik! Yaxşı nəticə göstərdiniz!";
      case "D":
        return "Təbrik edirik! Qənaətbəxş nəticə göstərdiniz!";
      case "E":
        return "Təbrik edirik! İmtahandan keçdiniz!";
      default:
        return "";
    }
  };

  const handleClose = () => {
    console.log("Popup closed clicked");
    if (typeof onClose === "function") {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center backdrop-blur-2xl bg-opacity-50 z-50">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md text-center transform transition-all duration-300 scale-100">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">İmtahan Bitdi</h2>
        <div className="space-y-4">
          <p className="text-lg text-gray-700">
            İmtahan balı:{" "}
            <span
              className={`font-semibold ${
                isExamPassing ? "text-indigo-600" : "text-red-600"
              }`}
            >
              {score}
            </span>
          </p>
          <p className="text-lg text-gray-700">
            Giriş balı:{" "}
            <span className="font-semibold text-indigo-600">
              {preExam || 0}
            </span>
          </p>
          <p className="text-lg text-gray-700">
            Yekun bal:{" "}
            <span
              className={`font-semibold ${
                isPassing ? "text-indigo-600" : "text-red-600"
              }`}
            >
              {finalScore}
            </span>
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
          <p
            className={`text-lg font-medium ${
              isPassing ? "text-green-600" : "text-red-600"
            }`}
          >
            {getMessage()}
          </p>
        </div>
        <button
          onClick={handleClose}
          className="mt-6 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 cursor-pointer"
        >
          Bağla
        </button>
      </div>
    </div>
  );
};

export default Popup;
