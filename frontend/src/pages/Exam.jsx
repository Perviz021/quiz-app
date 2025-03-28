import { useState, useEffect, useRef, useCallback } from "react";
import { useBeforeUnload, useNavigate, useParams } from "react-router-dom";
import Popup from "../components/Popup";
import { useExam } from "../context/ExamContext";

const API_BASE = "http://localhost:5000/api";

const Exam = () => {
  const { subjectCode } = useParams();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(600);
  const [examStarted, setExamStarted] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const { isExamActive, setIsExamActive } = useExam();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Create refs for each question
  const questionRefs = useRef([]);

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

  const handleStartExam = () => {
    setExamStarted(true);
    setIsExamActive(true);
  };

  const handleAnswer = (questionId, optionIndex) => {
    if (examStarted && timeLeft > 0 && !submitted) {
      setAnswers({ ...answers, [questionId]: optionIndex });
    }
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    navigate("/");
  };

  // Add this useEffect to handle force submit requests
  useEffect(() => {
    const handleStorageChange = () => {
      if (localStorage.getItem("forceSubmit") === "true") {
        handleForceSubmit();
        localStorage.removeItem("forceSubmit");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    if (examStarted && !submitted) {
      window.history.pushState({ examInProgress: true }, "");
    }
  }, [examStarted, submitted]);

  // Modify your existing force submit function
  const handleForceSubmit = useCallback(() => {
    if (isSubmitting || submitted) return Promise.resolve();

    setIsSubmitting(true);
    setSubmitted(true);
    setIsExamActive(false);

    return fetch(`${API_BASE}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        subjectCode: subjectCode,
        answers: [],
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Submission failed");
        return res.json();
      })
      .finally(() => setIsSubmitting(false));
  }, [isSubmitting, submitted, subjectCode]);

  const handleSubmit = useCallback(() => {
    if (submitted) return;

    setSubmitted(true);
    setIsExamActive(false);

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
        if (data.error) throw new Error(data.error);
        setScore(data.score);
        setShowPopup(true);
      })
      .catch((err) => {
        console.error("Submission error:", err);
        setSubmitted(false);
      });
  }, [submitted, questions, answers, subjectCode]);

  // Handle browser back button
  useEffect(() => {
    if (!examStarted || submitted) return;

    const handleBackButton = async (e) => {
      e.preventDefault();

      if (isSubmitting) {
        alert("İmtahan yadda saxlanılır... Zəhmət olmasa gözləyin.");
        return;
      }

      const confirmLeave = window.confirm(
        "Siz imtahanı tərk edirsiniz! Əgər çıxarsanız, 0 bal alacaqsınız!"
      );

      if (confirmLeave) {
        try {
          await handleForceSubmit();
          setTimeout(() => navigate(-1, { replace: true }), 0);
        } catch (error) {
          console.error("Failed to submit before navigation:", error);
        }
      } else {
        window.history.pushState(null, "", window.location.pathname);
      }
    };

    window.history.pushState({ examInProgress: true }, "");
    window.addEventListener("popstate", handleBackButton);

    return () => {
      window.removeEventListener("popstate", handleBackButton);
      if (window.history.state?.examInProgress) {
        window.history.go(-1);
      }
    };
  }, [examStarted, submitted, isSubmitting, handleForceSubmit, navigate]);

  // useEffect(() => {
  //   const handleBeforeUnload = (e) => {
  //     if (examStarted && !submitted) {
  //       handleForceSubmit(); // Submit in background
  //       e.preventDefault();
  //       e.returnValue =
  //         "Siz imtahanı tərk edirsiniz! Əgər çıxarsanız, 0 bal alacaqsınız!";
  //     }
  //   };

  //   window.addEventListener("beforeunload", handleBeforeUnload);
  //   return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  // }, [examStarted, submitted, handleForceSubmit]);

  useBeforeUnload(
    useCallback(
      (e) => {
        if (examStarted && !submitted) {
          handleForceSubmit();
          e.preventDefault();
          return (e.returnValue = "Are you sure you want to leave?");
        }
      },
      [examStarted, submitted, handleForceSubmit]
    )
  );

  useEffect(() => {
    let timer;

    // Timer Countdown
    if (examStarted && timeLeft > 0 && !submitted) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && examStarted) {
      handleSubmit();
    }

    return () => {
      clearInterval(timer);
    };
  }, [examStarted, timeLeft, submitted, handleSubmit]); // Add handleSubmit to dependencies

  // Scroll to a specific question when clicking the navigation
  const scrollToQuestion = (index) => {
    questionRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  return (
    <div className="container mx-auto p-4 flex">
      {/* Left Side: Exam Questions */}
      <div className="flex-grow">
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
              Time Left: {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:
              {String(timeLeft % 60).padStart(2, "0")}
            </div>
            {questions.map((q, index) => (
              <div
                key={q.id}
                ref={(el) => (questionRefs.current[index] = el)}
                className="p-4 border rounded-lg mb-4"
              >
                <p
                  className="font-semibold text-lg"
                  dangerouslySetInnerHTML={{
                    __html: `${index + 1}. ${q.question}`,
                  }}
                ></p>
                <div className="mt-2 space-y-2">
                  {[q.option1, q.option2, q.option3, q.option4, q.option5].map(
                    (option, optionIndex) => (
                      <label
                        key={optionIndex}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={`question-${q.id}`}
                          value={optionIndex + 1}
                          checked={answers[q.id] === optionIndex + 1}
                          onChange={() => handleAnswer(q.id, optionIndex + 1)}
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
              disabled={submitted || isSubmitting}
              className={`mt-4 px-6 py-3 rounded-lg text-lg ${
                submitted || isSubmitting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600 text-white cursor-pointer"
              }`}
            >
              {isSubmitting
                ? "Yadda saxlanılır..."
                : submitted
                ? "İmtahan sonlandı"
                : "İmtahanı bitir"}
            </button>
          </div>
        )}
      </div>

      {/* Right Side: Question Navigation */}
      {examStarted && (
        <div className="fixed top-20 right-4 w-64 p-4 bg-white border border-gray-300 shadow-lg rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-center">
            Sual Naviqasiyası
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, index) => (
              <button
                key={q.id}
                onClick={() => scrollToQuestion(index)}
                className={`w-10 h-10 flex items-center justify-center rounded-full font-semibold cursor-pointer ${
                  answers[q.id] ? "bg-green-500 text-white" : "bg-gray-200"
                } hover:bg-gray-300 transition`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ✅ Show the popup when the exam is submitted */}
      {showPopup && <Popup score={score} onClose={handleClosePopup} />}
    </div>
  );
};

export default Exam;
