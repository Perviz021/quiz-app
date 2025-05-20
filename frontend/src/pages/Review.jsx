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
      const studentAnswer = q.selected_option
        ? getOptionLetter(q.selected_option - 1)
        : "-";
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
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
            >
              {showSummary ? "Detallı Baxış" : "Xülasə"}
            </button>
          </div>

          {showSummary ? (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4">Sual №</th>
                    <th className="text-left py-3 px-4">Düzgün Cavab</th>
                    <th className="text-left py-3 px-4">Sizin Cavabınız</th>
                    <th className="text-left py-3 px-4">Nəticə</th>
                  </tr>
                </thead>
                <tbody>
                  {getAnswerSummary().map((item) => (
                    <tr
                      key={item.questionNumber}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">{item.questionNumber}</td>
                      <td className="py-3 px-4 font-medium text-green-600">
                        {item.correctAnswer}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full ${
                            item.isCorrect
                              ? "bg-green-100 text-green-700 border border-green-500"
                              : "bg-red-100 text-red-700 border border-red-500"
                          }`}
                        >
                          {item.studentAnswer}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {item.isCorrect ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-red-600">✗</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
