import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const Review = () => {
  const { subjectCode } = useParams();
  //   const studentId = localStorage.getItem("studentId");
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:5000/api/review/${subjectCode}`, {
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

    const selected = options[question.selected_option - 1]; // Map index to actual string
    const correct = options[question.correct_option - 1];

    if (option === selected && option === correct) {
      return "bg-green-200 border-green-600"; // Correctly selected
    }
    if (option === selected && option !== correct) {
      return "bg-red-200 border-red-600"; // Wrong selection
    }
    if (option === correct) {
      return "bg-green-100 border-green-400"; // Correct answer shown
    }
    return "bg-white"; // Neutral
  };

  const formatTextWithNewlines = (text) => {
    return text ? text.replace(/\n/g, "<br />") : "";
  };

  return (
    <div>
      {/* {error && <p className="text-red-600">{error}</p>} */}
      {loading ? (
        <p>Yüklənir...</p>
      ) : (
        <>
          <div className="max-w-4xl mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Cavabların Yoxlanması</h2>
            {questions.map((q, index) => (
              <div key={q.questionId} className="mb-6">
                <p
                  className="font-semibold text-lg"
                  dangerouslySetInnerHTML={{
                    __html: `${index + 1}. ${formatTextWithNewlines(
                      q.question
                    )}`,
                  }}
                ></p>
                <div className="grid gap-2">
                  {[q.option1, q.option2, q.option3, q.option4, q.option5].map(
                    (opt, idx) => (
                      <div
                        key={idx}
                        className={`p-2 border rounded ${getOptionClass(
                          opt,
                          q
                        )}`}
                      >
                        {opt}
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Review;
