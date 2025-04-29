import { useEffect, useRef, useCallback, useReducer, useState } from "react";
import { useBeforeUnload, useNavigate, useParams } from "react-router-dom";
import Popup from "../components/Popup";
import { useExam } from "../context/ExamContext";
import API_BASE from "../config/api";
import { io } from "socket.io-client";
const socket = io("http://192.168.11.78:5000"); // change URL for production

const initialState = {
  questions: [],
  answers: {},
  submitted: false,
  score: 0,
  timeLeft: 5400,
  examStarted: false,
  isSubmitting: false,
  showPopup: false,
  error: null,
};

const reducer = (state, action) => {
  switch (action.type) {
    case "SET_QUESTIONS":
      return { ...state, questions: action.payload };
    case "START_EXAM":
      return { ...state, examStarted: true };
    case "SET_ANSWER":
      return { ...state, answers: { ...state.answers, ...action.payload } };
    case "SUBMIT_EXAM":
      return { ...state, submitted: true, isSubmitting: true };
    case "SET_SCORE":
      return { ...state, score: action.payload, showPopup: true };
    case "DECREMENT_TIME":
      return { ...state, timeLeft: state.timeLeft - 1 };
    case "STOP_SUBMITTING":
      return { ...state, isSubmitting: false };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

const Exam = () => {
  const { subjectCode } = useParams();
  const navigate = useNavigate();
  const { isExamActive, setIsExamActive } = useExam();
  const questionRefs = useRef([]);
  const [state, dispatch] = useReducer(reducer, initialState);
  const [acceptedRules, setAcceptedRules] = useState(false);

  const handleSubmit = useCallback(() => {
    if (state.submitted) return;

    dispatch({ type: "SUBMIT_EXAM" });
    setIsExamActive(false);

    const formattedAnswers = state.questions.map((q) => ({
      questionId: q.id,
      selectedOption: state.answers[q.id] ?? -1,
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
      .then((data) => dispatch({ type: "SET_SCORE", payload: data.score }))
      .catch((err) => console.error("Submission error:", err))
      .finally(() => dispatch({ type: "STOP_SUBMITTING" }));
  }, [state, subjectCode]);

  useEffect(() => {
    fetch(`${API_BASE}/questions/${subjectCode}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => {
        if (res.status === 403)
          throw new Error("You have already taken this exam.");
        if (!res.ok) throw new Error("Failed to fetch questions");
        return res.json();
      })
      .then((data) => dispatch({ type: "SET_QUESTIONS", payload: data }))
      .catch((err) => dispatch({ type: "SET_ERROR", payload: err.message }));
  }, [subjectCode]);

  useEffect(() => {
    const studentId = localStorage.getItem("studentId"); // or however you're storing it
    if (studentId) {
      socket.emit("join_exam", studentId); // student joins their own room
    }

    // Listen for force submit
    socket.on("force_submit", () => {
      console.log("Admin forced submission!");
      if (!state.submitted) {
        handleSubmit();
      }
    });

    // Listen for time extension
    socket.on("extend_time", (extraMinutes) => {
      console.log(`Exam time extended by ${extraMinutes} minutes`);
      dispatch({ type: "DECREMENT_TIME", payload: -(extraMinutes * 60) });
    });

    return () => {
      socket.disconnect();
    };
  }, [handleSubmit, state.submitted]);

  const handleStartExam = async () => {
    try {
      const token = localStorage.getItem("token");

      await fetch(`${API_BASE}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subjectCode }),
      });

      dispatch({ type: "START_EXAM" });
      setIsExamActive(true);
    } catch (error) {
      console.error("Failed to start exam:", error);
      dispatch({
        type: "SET_ERROR",
        payload: "İmtahan başlatmaq mümkün olmadı.",
      });
    }
  };

  const handleAnswer = (questionId, optionIndex) => {
    if (state.examStarted && state.timeLeft > 0 && !state.submitted) {
      dispatch({ type: "SET_ANSWER", payload: { [questionId]: optionIndex } });
    }
  };

  useBeforeUnload(
    useCallback(
      (e) => {
        if (state.examStarted && !state.submitted) {
          handleSubmit();
          e.preventDefault();
          return (e.returnValue = "Are you sure you want to leave?");
        }
      },
      [state.examStarted, state.submitted, handleSubmit]
    )
  );

  useEffect(() => {
    let timer;
    if (state.examStarted && state.timeLeft > 0 && !state.submitted) {
      timer = setInterval(() => dispatch({ type: "DECREMENT_TIME" }), 1000);
    } else if (state.timeLeft === 0 && state.examStarted) {
      handleSubmit();
    }
    return () => clearInterval(timer);
  }, [state.examStarted, state.timeLeft, state.submitted, handleSubmit]);

  const scrollToQuestion = (index) => {
    questionRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  return (
    <div className="container mx-auto p-4 flex">
      <div className="flex-grow">
        {!state.examStarted ? (
          <div className="max-w-2xl mx-auto bg-white shadow-lg rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-center mb-4">
              İmtahan Qaydaları
            </h2>
            <div className="overflow-y-auto max-h-80 p-4 border rounded-lg bg-gray-50 text-gray-700 space-y-2">
              <p>1. Tələbə bileti olmadan imtahana girmək qadağandır.</p>
              <p>
                2. Auditoriyanın sakitliyini pozmaq, yüksək səslə danışmaq
                qadağandır.
              </p>
              <p>3. Kənar kompüter və masalara baxmaq qadağandır.</p>
              <p>4. Nəzarətçinin təlimatlarına uymamaq qadağandır.</p>
              <p>
                5. İmtahan zamanı qulaqlıq, telefon və digər texniki
                avadanlıqlardan istifadə etmək qadağandır.
              </p>
              <p>
                6. Konspekt, dəftər və digər köməkçi vasitələrdən istifadə etmək
                qadağandır.
              </p>
              <p>7. Stol, stul və divarlara yazı yazmaq qadağandır.</p>
              <p>8. Digər tələbə yoldaşına kömək etmək qadağandır.</p>
              <p>9. Kompüterdə başqa səhifə açmaq qadağandır.</p>
              <p>10. Qaydalara riayət etməmək cəzalandırılır.</p>
            </div>

            <div className="flex items-center mt-4">
              <input
                id="acceptRules"
                type="checkbox"
                checked={acceptedRules}
                onChange={(e) => setAcceptedRules(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="acceptRules" className="text-sm cursor-pointer">
                Qaydaları oxudum və razıyam
              </label>
            </div>

            <button
              onClick={handleStartExam}
              disabled={!acceptedRules}
              className={`mt-4 w-full px-6 py-3 rounded-lg text-lg ${
                acceptedRules
                  ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                  : "bg-gray-400 text-white cursor-not-allowed"
              }`}
            >
              İmtahana Başla
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold mb-4">İmtahan</h2>

            <div className="text-xl font-semibold mb-4">
              Qalan vaxt:{" "}
              {String(Math.floor(state.timeLeft / 60)).padStart(2, "0")}:
              {String(state.timeLeft % 60).padStart(2, "0")}
            </div>
            {state.error ? (
              <p className="text-red-500">{state.error}</p>
            ) : (
              state.questions.map((q, index) => (
                <div
                  key={q.id}
                  ref={(el) => (questionRefs.current[index] = el)}
                  className="p-4 border rounded-lg mb-4"
                >
                  {q.question.startsWith("uploads/") &&
                  (q.question.endsWith(".png") ||
                    q.question.endsWith(".jpg") ||
                    q.question.endsWith(".jpeg") ||
                    q.question.endsWith(".gif")) ? (
                    <div className="mb-2">
                      <p className="font-semibold text-lg">{index + 1}.</p>
                      <img
                        src={`http://localhost:5000/${q.question}`}
                        alt="Sual şəkli"
                        className="w-full max-w-md object-contain"
                      />
                    </div>
                  ) : (
                    <p
                      className="font-semibold text-lg"
                      dangerouslySetInnerHTML={{
                        __html: `${index + 1}. ${q.question}`,
                      }}
                    ></p>
                  )}
                  <div className="mt-2 space-y-2">
                    {[
                      q.option1,
                      q.option2,
                      q.option3,
                      q.option4,
                      q.option5,
                    ].map((option, optionIndex) => (
                      <label
                        key={optionIndex}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={`question-${q.id}`}
                          value={optionIndex}
                          checked={state.answers[q.id] === optionIndex + 1}
                          onChange={() => handleAnswer(q.id, optionIndex + 1)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
            <button
              onClick={handleSubmit}
              disabled={state.submitted || state.isSubmitting}
              className={`mt-4 px-6 py-3 rounded-lg text-lg ${
                state.submitted || state.isSubmitting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600 text-white cursor-pointer"
              }`}
            >
              {state.isSubmitting
                ? "Yadda saxlanılır..."
                : state.submitted
                ? "İmtahan sonlandı"
                : "İmtahanı bitir"}
            </button>
          </div>
        )}
      </div>

      {state.examStarted && state.questions.length > 0 && (
        <div className="fixed top-20 right-4 w-64 p-4 bg-white border border-gray-300 shadow-lg rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-center">
            Sual Naviqasiyası
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {state.questions.map((q, index) => (
              <button
                key={q.id}
                onClick={() => scrollToQuestion(index)}
                className={`w-10 h-10 flex items-center justify-center rounded-full font-semibold cursor-pointer ${
                  q.id in state.answers
                    ? "bg-green-500 text-white"
                    : "bg-gray-200"
                } hover:bg-gray-300 transition`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {state.showPopup && (
        <Popup
          score={state.score}
          onClose={() => navigate(`/review/${subjectCode}`)}
        />
      )}
    </div>
  );
};

export default Exam;
