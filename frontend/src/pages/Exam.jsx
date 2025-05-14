import { useEffect, useRef, useCallback, useReducer, useState } from "react";
import { useBeforeUnload, useNavigate, useParams } from "react-router-dom";
import Popup from "../components/Popup";
import { useExam } from "../context/ExamContext";
import API_BASE from "../config/api";
import { io } from "socket.io-client";
import { toast } from "react-toastify";

// Derive Socket.IO URL from VITE_API_BASE or use fallback
const SOCKET_SERVER_URL = import.meta.env.VITE_API_BASE
  ? import.meta.env.VITE_API_BASE.replace(/\/api$/, "")
  : "http://192.168.11.163:5000";

const socket = io(SOCKET_SERVER_URL, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 30000,
  autoConnect: true,
});

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
    case "SET_TIME_LEFT":
      return { ...state, timeLeft: action.payload };
    case "DECREMENT_TIME":
      return { ...state, timeLeft: state.timeLeft - 1 };
    case "STOP_SUBMITTING":
      return { ...state, isSubmitting: false };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "EXTEND_TIME":
      return { ...state, timeLeft: state.timeLeft + action.payload };
    case "FORCE_SUBMIT":
      return {
        ...state,
        submitted: true,
        isSubmitting: false,
        showPopup: true,
        score: action.payload || 0,
      };
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
  const roomId = useRef(null);

  const handleSubmit = useCallback(() => {
    if (state.submitted) {
      console.log("Exam already submitted, preventing resubmission");
      return;
    }

    console.log("Submitting exam with answers:", state.answers);
    dispatch({ type: "SUBMIT_EXAM" });
    setIsExamActive(false);

    const formattedAnswers = state.questions.map((q) => ({
      questionId: q.id,
      selectedOption: state.answers[q.id] ?? -1,
    }));

    console.log("Formatted answers for submission:", formattedAnswers);

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
        console.log("Submission successful, score:", data.score);
        dispatch({ type: "SET_SCORE", payload: data.score });
      })
      .catch((err) => {
        console.error("Submission error:", err);
        toast.error(`İmtahanı təhvil vermək mümkün olmadı: ${err.message}`);
        dispatch({ type: "SET_ERROR", payload: err.message });
      })
      .finally(() => dispatch({ type: "STOP_SUBMITTING" }));
  }, [state, subjectCode]);

  const handleStartExam = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subjectCode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start exam");

      dispatch({ type: "START_EXAM" });
      dispatch({ type: "SET_TIME_LEFT", payload: data.timeLeft || 5400 });
      setIsExamActive(true);

      // After starting the exam, initialize socket connection
      const studentId = localStorage.getItem("studentId");
      if (studentId) {
        roomId.current = `${studentId}_${subjectCode}`;
        socket.emit("join_exam", { roomId: roomId.current });
      }

      // Fetch questions after starting the exam
      fetchQuestions();
    } catch (error) {
      console.error("Failed to start exam:", error);
      dispatch({
        type: "SET_ERROR",
        payload: `İmtahan başlatmaq mümkün olmadı: ${error.message}`,
      });
      toast.error(`İmtahan başlatmaq mümkün olmadı: ${error.message}`);
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`${API_BASE}/questions/${subjectCode}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (response.status === 403) {
        throw new Error("You have already taken this exam.");
      }
      if (!response.ok) {
        throw new Error("Failed to fetch questions");
      }

      const data = await response.json();
      dispatch({ type: "SET_QUESTIONS", payload: data });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err.message });
    }
  };

  const handleSubmitRef = useRef(() => {});
  const submittedRef = useRef(false);

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  useEffect(() => {
    submittedRef.current = state.submitted;
  }, [state.submitted]);

  const forceSubmitHandler = useCallback(() => {
    if (!submittedRef.current) {
      console.log("Received force-submit event");
      submittedRef.current = true;
      setIsExamActive(false);

      // Show warning to student
      toast.warn(
        "İmtahan admin tərəfindən dayandırıldı. Cavablarınız avtomatik təhvil verilir..."
      );

      // Submit current answers within grace period
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
        .then((data) => {
          if (data.error) throw new Error(data.error);
          dispatch({ type: "FORCE_SUBMIT", payload: data.score });
        })
        .catch((err) => {
          console.error("Force submit failed:", err);
          toast.error("Cavabları təhvil vermək mümkün olmadı.");
        });
    } else {
      console.log("Ignoring force-submit, already submitted");
    }
  }, [subjectCode, state.questions, state.answers, setIsExamActive]);

  const examStoppedHandler = useCallback(() => {
    console.log("Received exam-stopped event from server");
    navigate(`/review/${subjectCode}`);
  }, [subjectCode, navigate]);

  useEffect(() => {
    const studentId = localStorage.getItem("studentId");
    if (!studentId || !state.examStarted) return;

    roomId.current = `${studentId}_${subjectCode}`;
    console.log("Setting up socket connection for room:", roomId.current);

    // Socket event handlers
    const updateTimeHandler = ({ timeLeft }) => {
      console.log(`Received time update: ${timeLeft} seconds`);
      if (!submittedRef.current && timeLeft !== undefined) {
        dispatch({ type: "SET_TIME_LEFT", payload: timeLeft });
      }
    };

    const extendTimeHandler = (extraMinutes) => {
      console.log(`Exam time extended by ${extraMinutes} minutes`);
      dispatch({ type: "EXTEND_TIME", payload: extraMinutes * 60 });
      toast.info(`İmtahan vaxtı ${extraMinutes} dəqiqə artırıldı`);
    };

    const errorHandler = (message) => {
      console.error("Socket error:", message);
      toast.error(`Bağlantı xətası: ${message}`);
      if (message.includes("No active exam session")) {
        navigate("/dashboard");
      }
    };

    const connectHandler = () => {
      console.log("🟢 Socket connected:", socket.id);
      if (state.examStarted) {
        console.log("Joining exam room:", roomId.current);
        socket.emit("join_exam", { roomId: roomId.current });
      }
    };

    const reconnectHandler = () => {
      console.log("Socket reconnected!");
      if (state.examStarted) {
        console.log("Rejoining exam room after reconnect:", roomId.current);
        socket.emit("join_exam", { roomId: roomId.current });
        toast.info("İmtahan bağlantısı bərpa olundu.");
      }
    };

    // Set up socket listeners
    socket.on("connect", connectHandler);
    socket.on("reconnect", reconnectHandler);
    socket.on("reconnect_error", (error) => {
      console.error("Reconnect error:", error);
      toast.error("Bağlantı bərpa edilə bilmədi.");
    });
    socket.on("error", errorHandler);
    socket.on("force_submit", forceSubmitHandler);
    socket.on("exam_stopped", examStoppedHandler);
    socket.on("extend_time", extendTimeHandler);
    socket.on("update_time", updateTimeHandler);

    // Join exam room on mount
    if (state.examStarted && socket.connected) {
      console.log("Initially joining exam room:", roomId.current);
      socket.emit("join_exam", { roomId: roomId.current });
    }

    return () => {
      console.log("Cleaning up socket listeners");
      socket.off("connect", connectHandler);
      socket.off("reconnect", reconnectHandler);
      socket.off("reconnect_error");
      socket.off("error", errorHandler);
      socket.off("force_submit", forceSubmitHandler);
      socket.off("exam_stopped", examStoppedHandler);
      socket.off("extend_time", extendTimeHandler);
      socket.off("update_time", updateTimeHandler);
    };
  }, [
    subjectCode,
    navigate,
    state.examStarted,
    forceSubmitHandler,
    examStoppedHandler,
  ]);

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
    } else if (state.timeLeft <= 0 && state.examStarted && !state.submitted) {
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
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
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
                  : "bg-green-600 text-white hover:bg-green-700"
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
                className={`w-10 h-10 flex items-center justify-center rounded-full font-semibold transition-all duration-200 ${
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
