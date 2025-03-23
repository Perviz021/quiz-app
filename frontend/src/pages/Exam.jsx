import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const API_BASE = "http://localhost:5000/api";

const Exam = () => {
  const { subjectCode } = useParams();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(3600);
  const [examStarted, setExamStarted] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/questions/${subjectCode}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch questions");
        return res.json();
      })
      .then(setQuestions)
      .catch((error) => console.error("Error:", error));
  }, [subjectCode]);

  useEffect(() => {
    let timer;
    if (examStarted && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && examStarted) {
      handleSubmit();
    }
    return () => clearInterval(timer);
  }, [examStarted, timeLeft]);

  const handleStartExam = () => {
    setExamStarted(true);
  };

  const handleAnswer = (questionId, optionIndex) => {
    if (examStarted && timeLeft > 0 && !submitted) {
      setAnswers({ ...answers, [questionId]: optionIndex });
    }
  };

  const handleSubmit = () => {
    if (submitted) return; // Prevent double submission

    setSubmitted(true); // Disable button after first click

    const formattedAnswers = questions.map((q) => ({
      questionId: q.id,
      selectedOption: answers[q.id] ?? -1,
    }));

    fetch(`${API_BASE}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        subjectCode: subjectCode,
        answers: formattedAnswers,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          console.error("Submission error:", data.error);
          setSubmitted(false); // Re-enable button if error
        } else {
          setScore(data.score);
        }
      })
      .catch(() => setSubmitted(false)); // Re-enable button if network error
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">İmtahan</h2>
      {!examStarted ? (
        <button
          onClick={handleStartExam}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg text-lg hover:bg-blue-600 cursor-pointer"
        >
          İmtahana başla
        </button>
      ) : (
        <div>
          <div className="text-xl font-semibold mb-4">
            Time Left: {Math.floor(timeLeft / 60)}:{timeLeft % 60}
          </div>
          {questions.map((q) => (
            <div key={q.id} className="p-4 border rounded-lg mb-4">
              <p className="font-semibold text-lg">{q.question}</p>
              <div className="mt-2 space-y-2">
                {[q.option1, q.option2, q.option3, q.option4, q.option5].map(
                  (option, index) => (
                    <label
                      key={index}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name={`question-${q.id}`}
                        value={index + 1}
                        checked={answers[q.id] === index + 1}
                        onChange={() => handleAnswer(q.id, index + 1)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span>{option}</span>
                    </label>
                  )
                )}
              </div>
            </div>
          ))}
          <button
            onClick={handleSubmit}
            disabled={submitted}
            className={`mt-4 px-6 py-3 rounded-lg text-lg ${
              submitted
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600 text-white"
            }`}
          >
            {submitted ? "Exam Submitted" : "Submit Exam"}
          </button>
          {submitted && (
            <p className="mt-4 text-xl font-semibold">Your Score: {score}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Exam;
