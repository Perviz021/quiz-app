import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API_BASE from "../config/api";

const Review = () => {
  const { subjectCode } = useParams();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSummary, setShowSummary] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/review/${subjectCode}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load review data");
        return res.json();
      })
      .then((data) => {
        setQuestions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [subjectCode]);

  const getOptionClass = (option, question) => {
    const options = [
      question.option1,
      question.option2,
      question.option3,
      question.option4,
      question.option5,
    ];

    const selected = options[question.selected_option - 1];
    const correct = options[question.correct_option - 1];

    if (option === selected && option === correct) {
      return "bg-green-100 border-green-500 text-green-700";
    }

    if (selected && selected !== correct) {
      if (option === selected) {
        return "bg-red-100 border-red-500 text-red-700";
      }
      if (option === correct) {
        return "bg-green-100 border-green-500 text-green-700";
      }
    }

    if (!selected && option === correct) {
      return "bg-yellow-100 border-yellow-500 text-yellow-700";
    }

    return "bg-gray-50 border-gray-200 text-gray-700";
  };

  const formatTextWithNewlines = (text) => {
    return text ? text.replace(/\n/g, "<br />") : "";
  };

  const getOptionLetter = (index) => {
    return String.fromCharCode(65 + index); // A, B, C, D, E
  };

  const getAnswerSummary = () => {
    return questions.map((q, index) => {
      const options = [q.option1, q.option2, q.option3, q.option4, q.option5];
      const correctAnswer = getOptionLetter(q.correct_option - 1);
      const studentAnswer =
        q.selected_option === -1 ? "-" : getOptionLetter(q.selected_option - 1);
      const isCorrect = q.selected_option === q.correct_option;

      return {
        questionNumber: index + 1,
        correctAnswer,
        studentAnswer,
        isCorrect,
      };
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {error && (
        <p className="text-red-600 text-lg text-center mb-6">{error}</p>
      )}
      {loading ? (
        <p className="text-gray-600 text-lg text-center">Yüklənir...</p>
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Cavabların Yoxlanması
            </h2>
            <button
              onClick={() => setShowSummary(!showSummary)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200 cursor-pointer"
            >
              {showSummary ? "Detallı Baxış" : "Xülasə"}
            </button>
          </div>

          <div className="bg-white rounded-lg p-4 mb-6 flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-500 rounded"></div>
              <span>Düzgün cavab</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-500 rounded"></div>
              <span>Yanlış cavab</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-500 rounded"></div>
              <span>Cavablanmamış sual</span>
            </div>
          </div>

          {showSummary ? (
            <div className="bg-white rounded-2xl shadow-lg p-3 mb-4">
              {Array.from({
                length: Math.ceil(getAnswerSummary().length / 10),
              }).map((_, blockIdx) => {
                const block = getAnswerSummary().slice(
                  blockIdx * 10,
                  blockIdx * 10 + 10
                );
                return (
                  <table
                    key={blockIdx}
                    className="min-w-max border-separate border-spacing-y-0 mb-2 w-full text-xs border border-gray-300 rounded-lg shadow-sm pl-[10px]"
                  >
                    <tbody>
                      {/* Row 1: Question Numbers */}
                      <tr>
                        <td className="text-gray-500 font-medium pr-2 py-1 text-left align-middle">
                          №
                        </td>
                        {block.map((item) => (
                          <td
                            key={`num-${item.questionNumber}`}
                            className="text-center font-medium px-1 py-1 text-black align-middle"
                          >
                            {item.questionNumber}
                          </td>
                        ))}
                      </tr>
                      {/* Row 2: Correct Answers */}
                      <tr>
                        <td className="text-gray-500 font-medium pr-2 py-1 text-left align-middle">
                          Düzgün cavab
                        </td>
                        {block.map((item) => (
                          <td
                            key={`correct-${item.questionNumber}`}
                            className="text-center font-medium text-green-600 px-1 py-1 align-middle"
                          >
                            {item.correctAnswer}
                          </td>
                        ))}
                      </tr>
                      {/* Row 3: Student Answers */}
                      <tr>
                        <td className="text-gray-500 font-medium pr-2 py-1 text-left align-middle">
                          Sizin cavabınız
                        </td>
                        {block.map((item) => (
                          <td
                            key={`student-${item.questionNumber}`}
                            className="text-center px-1 py-1 align-middle"
                          >
                            <span
                              className={`inline-block w-5 h-5 rounded-full text-[11px] font-medium border ${
                                item.studentAnswer === "-"
                                  ? "bg-yellow-100 text-yellow-700 border-yellow-500"
                                  : item.isCorrect
                                  ? "bg-green-100 text-green-700 border-green-500"
                                  : "bg-red-100 text-red-700 border-red-500"
                              }`}
                            >
                              {item.studentAnswer}
                            </span>
                          </td>
                        ))}
                      </tr>
                      {/* Row 4: Result */}
                      <tr>
                        <td className="text-gray-500 font-medium pr-2 py-1 text-left align-middle">
                          Nəticə
                        </td>
                        {block.map((item) => (
                          <td
                            key={`result-${item.questionNumber}`}
                            className="text-center px-1 py-1 text-base align-middle"
                          >
                            {item.isCorrect ? (
                              <span className="text-green-600">✓</span>
                            ) : (
                              <span className="text-red-600">✗</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                );
              })}
            </div>
          ) : (
            questions.map((q, index) => (
              <div
                key={q.questionId}
                className="mb-8 bg-white p-6 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl"
              >
                <p
                  className="font-semibold text-lg text-gray-900 mb-4"
                  dangerouslySetInnerHTML={{
                    __html: `${index + 1}. ${formatTextWithNewlines(
                      q.question
                    )}`,
                  }}
                ></p>
                <div className="grid gap-3">
                  {[q.option1, q.option2, q.option3, q.option4, q.option5].map(
                    (opt, idx) =>
                      opt && (
                        <div
                          key={idx}
                          className={`p-3 border rounded-lg ${getOptionClass(
                            opt,
                            q
                          )} transition-colors duration-200`}
                        >
                          {opt}
                        </div>
                      )
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Review;
