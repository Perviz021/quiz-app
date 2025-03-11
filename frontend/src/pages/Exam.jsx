import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const mockQuestions = {
  math: [
    {
      id: 1,
      question: "What is 2 + 2?",
      options: ["3", "4", "5", "6"],
      answer: 1,
    },
    {
      id: 2,
      question: "What is 5 × 6?",
      options: ["30", "25", "35", "20"],
      answer: 0,
    },
  ],
  science: [
    {
      id: 1,
      question: "What is H2O?",
      options: ["Oxygen", "Water", "Hydrogen", "Nitrogen"],
      answer: 1,
    },
    {
      id: 2,
      question: "Which planet is closest to the sun?",
      options: ["Earth", "Mars", "Mercury", "Venus"],
      answer: 2,
    },
  ],
};

const Exam = () => {
  const { subject } = useParams();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    // Fetch questions (using mock data for now)
    setQuestions(mockQuestions[subject] || []);
  }, [subject]);

  const handleAnswer = (questionId, optionIndex) => {
    setAnswers({ ...answers, [questionId]: optionIndex });
  };

  const handleSubmit = () => {
    let correctCount = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.answer) {
        correctCount++;
      }
    });
    setScore(correctCount);
    setSubmitted(true);
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Exam: {subject.toUpperCase()}</h2>

      {questions.length > 0 ? (
        <div className="space-y-6">
          {questions.map((q) => (
            <div key={q.id} className="p-4 border rounded-lg">
              <p className="font-semibold">{q.question}</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {q.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(q.id, index)}
                    className={`p-2 rounded-lg ${
                      answers[q.id] === index
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    {option}
                  </button>
                ))}
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
