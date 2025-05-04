import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API_BASE from "../config/api";

const Review = () => {
  const { subjectCode } = useParams();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return (
    <div className="container mx-auto px-4 py-8">
      {error && (
        <p className="text-red-600 text-lg text-center mb-6">{error}</p>
      )}
      {loading ? (
        <p className="text-gray-600 text-lg text-center">Yüklənir...</p>
      ) : (
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Cavabların Yoxlanması
          </h2>
          {questions.map((q, index) => (
            <div
              key={q.questionId}
              className="mb-8 bg-white p-6 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl"
            >
              <p
                className="font-semibold text-lg text-gray-900 mb-4"
                dangerouslySetInnerHTML={{
                  __html: `${index + 1}. ${formatTextWithNewlines(q.question)}`,
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
          ))}
        </div>
      )}
    </div>
  );
};

export default Review;
