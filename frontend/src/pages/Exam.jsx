import { useEffect, useRef, useCallback, useReducer, useState } from "react";
import { useBeforeUnload, useNavigate, useParams } from "react-router-dom";
import Popup from "../components/Popup";
import { useExam } from "../context/ExamContext";
import API_BASE from "../config/api";
import { io } from "socket.io-client";
const socket = io("http://192.168.11.78:5000", {
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  autoConnect: true,
});
import { toast } from "react-toastify";

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
    case "EXTEND_TIME":
      return { ...state, timeLeft: state.timeLeft + action.payload };
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

  const handleSubmitRef = useRef(() => {});
  const submittedRef = useRef(false);

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  useEffect(() => {
    submittedRef.current = state.submitted;
  }, [state.submitted]);

  useEffect(() => {
    const studentId = localStorage.getItem("studentId");
    if (studentId) {
      socket.emit("join_exam", studentId);
    }

    const forceSubmitHandler = () => {
      console.log("Admin forced submission!");
      if (!submittedRef.current) {
        handleSubmitRef.current();
      }
    };

    const extendTimeHandler = (extraMinutes) => {
      console.log(`Exam time extended by ${extraMinutes} minutes`);
      dispatch({ type: "EXTEND_TIME", payload: extraMinutes * 60 });
      toast.info(`İmtahan vaxtı ${extraMinutes} dəqiqə artırıldı`);
    };

    socket.on("force_submit", forceSubmitHandler);
    socket.on("extend_time", extendTimeHandler);

    return () => {
      socket.off("force_submit", forceSubmitHandler);
      socket.off("extend_time", extendTimeHandler);
    };
  }, []);

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
          e.returnValue = "Are you sure you want to leave?";
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
    <div className="container mx-auto px-4 py-8 flex">
      <div className="flex-grow">
        {!state.examStarted ? (
          <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-center mb-6 text-gray-900">
              İmtahan Qaydaları
            </h2>
            <div className="max-h-80 overflow-y-auto p-4 bg-gray-50 rounded-lg text-gray-700 space-y-3">
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
              <p>9. Kompüterdə başqa səhifə açmak qadağandır.</p>
              <p>10. Qaydalara riayət etməmək cəzalandırılır.</p>
            </div>

            <div className="flex items-center mt-6">
              <input
                id="acceptRules"
                type="checkbox"
                checked={acceptedRules}
                onChange={(e) => setAcceptedRules(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <label
                htmlFor="acceptRules"
                className="ml-2 text-sm text-gray-700 cursor-pointer"
              >
                Qaydaları oxudum və razıyam
              </label>
            </div>

            <button
              onClick={handleStartExam}
              disabled={!acceptedRules}
              className={`mt-6 w-full py-3 px-6 rounded-xl text-lg font-semibold transition-all duration-200 ${
                acceptedRules
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                  : "bg-gray-400 text-gray-200 cursor-not-allowed"
              }`}
            >
              İmtahana Başla
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">İmtahan</h2>

            <div className="text-xl font-semibold text-gray-800 mb-6 bg-indigo-50 p-4 rounded-lg">
              Qalan vaxt:{" "}
              <span className="font-bold">
                {String(Math.floor(state.timeLeft / 3600)).padStart(2, "0")}:
                {String(Math.floor((state.timeLeft % 3600) / 60)).padStart(
                  2,
                  "0"
                )}
                :{String(state.timeLeft % 60).padStart(2, "0")}
              </span>
            </div>

            {state.error ? (
              <p className="text-red-600 text-lg">{state.error}</p>
            ) : (
              state.questions.map((q, index) => (
                <div
                  key={q.id}
                  ref={(el) => (questionRefs.current[index] = el)}
                  className="p-6 bg-white border border-gray-200 rounded-2xl mb-6 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  {q.question.startsWith("uploads/") &&
                  (q.question.endsWith(".png") ||
                    q.question.endsWith(".jpg") ||
                    q.question.endsWith(".jpeg") ||
                    q.question.endsWith(".gif")) ? (
                    <div className="mb-4">
                      <p className="font-semibold text-lg text-gray-900">
                        {index + 1}.
                      </p>
                      <img
                        src={`http://localhost:5000/${q.question}`}
                        alt="Sual şəkli"
                        className="w-full max-w-md object-contain mt-2 rounded-lg"
                      />
                    </div>
                  ) : (
                    <p
                      className="font-semibold text-lg text-gray-900"
                      dangerouslySetInnerHTML={{
                        __html: `${index + 1}. ${q.question}`,
                      }}
                    ></p>
                  )}
                  <div className="mt-4 space-y-3">
                    {[
                      q.option1,
                      q.option2,
                      q.option3,
                      q.option4,
                      q.option5,
                    ].map(
                      (option, optionIndex) =>
                        option && (
                          <label
                            key={optionIndex}
                            className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                          >
                            <input
                              type="radio"
                              name={`question-${q.id}`}
                              value={optionIndex}
                              checked={state.answers[q.id] === optionIndex + 1}
                              onChange={() =>
                                handleAnswer(q.id, optionIndex + 1)
                              }
                              className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-gray-700">{option}</span>
                          </label>
                        )
                    )}
                  </div>
                </div>
              ))
            )}
            <button
              onClick={handleSubmit}
              disabled={state.submitted || state.isSubmitting}
              className={`mt-6 w-full py-3 px-6 rounded-xl text-lg font-semibold transition-all duration-200 ${
                state.submitted || state.isSubmitting
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700 cursor-pointer"
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
        <div className="fixed top-20 right-4 w-64 p-4 bg-white border border-gray-200 shadow-xl rounded-2xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">
            Sual Naviqasiyası
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {state.questions.map((q, index) => (
              <button
                key={q.id}
                onClick={() => scrollToQuestion(index)}
                className={`w-10 h-10 locuri items-center justify-center rounded-full font-semibold transition-all duration-200 ${
                  q.id in state.answers
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
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
