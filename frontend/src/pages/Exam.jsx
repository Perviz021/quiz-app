import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000"; // Change if deployed

const Exam = () => {
  const { subject } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 1 hour in seconds

  console.log("subject", subject);

  useEffect(() => {
    fetch(`${API_BASE}/subjects`)
      .then((res) => res.json())
      .then((subjects) => {
        const subjectObj = subjects.find(
          (s) => s.name.toLowerCase() === subject.toLowerCase()
        );
        if (subjectObj) {
          fetch(`${API_BASE}/questions/${subjectObj.id}`)
            .then((res) => res.json())
            .then(setQuestions);
        }
      });
  }, [subject]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    } else {
      handleSubmit();
    }
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleAnswer = (questionId, optionIndex) => {
    if (timeLeft > 0 && !submitted) {
      setAnswers({ ...answers, [questionId]: optionIndex });
    }
  };

  const handleSubmit = () => {
    const formattedAnswers = questions.map((q) => ({
      questionId: q.id,
      selectedOption: answers[q.id] ?? -1, // -1 if unanswered
    }));

    fetch(`${API_BASE}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentName: "Joshua Blaese", // Replace with actual student data
        subjectId: questions[0]?.subject_id,
        answers: formattedAnswers,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          console.error("Submission error:", data.error);
        } else {
          setScore(data.score);
          setSubmitted(true);
          setTimeLeft(0); // Stop timer
        }
      })
      .catch((err) => console.error("Network error:", err));
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Exam: {subject.toUpperCase()}</h2>

      <div className="text-xl font-semibold bg-gray-100 p-2 rounded-md text-center">
        ⏳ Time Left: {formatTime(timeLeft)}
      </div>

      {questions.length > 0 ? (
        <div className="space-y-6 mt-4">
          {questions.map((q) => (
            <div key={q.id} className="p-4 border rounded-lg">
              <p className="font-semibold">{q.question}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {[q.option1, q.option2, q.option3, q.option4, q.option5].map(
                  (option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswer(q.id, index)}
                      className={`p-2 rounded-lg ${
                        answers[q.id] === index
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200"
                      } ${
                        timeLeft === 0 ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      disabled={timeLeft === 0}
                    >
                      {option}
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
          {!submitted ? (
            <button
              onClick={handleSubmit}
              className="bg-green-500 text-white p-2 rounded-lg w-full"
            >
              Submit Exam
            </button>
          ) : (
            <div className="text-xl font-bold text-center">
              Your Score: {score} / {questions.length}
            </div>
          )}
        </div>
      ) : (
        <p>No questions available for this subject.</p>
      )}
    </div>
  );
};

export default Exam;
