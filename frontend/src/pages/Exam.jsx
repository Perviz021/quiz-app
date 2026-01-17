import { useEffect, useRef, useCallback, useReducer, useState } from "react";
import { useBeforeUnload, useNavigate, useParams } from "react-router-dom";
import Popup from "../components/Popup";
import ExamRules from "../components/ExamRules";
import { useExam } from "../context/ExamContext";
import API_BASE from "../config/api";
import { io } from "socket.io-client";
import { toast } from "react-toastify";

// Derive Socket.IO URL from VITE_API_BASE or use fallback
const SOCKET_SERVER_URL = import.meta.env.VITE_API_BASE
  ? import.meta.env.VITE_API_BASE.replace(/\/api$/, "")
  : "http://192.168.1.72:5000";

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
  preExam: 0,
  timeLeft: 5400,
  examStarted: false,
  isSubmitting: false,
  showPopup: false,
  error: null,
  showConfirmModal: false,
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
    case "SHOW_POPUP":
      return { ...state, showPopup: true };
    case "SHOW_CONFIRM_MODAL":
      return { ...state, showConfirmModal: true };
    case "HIDE_CONFIRM_MODAL":
      return { ...state, showConfirmModal: false };
    case "SET_PRE_EXAM":
      return { ...state, preExam: action.payload };
    default:
      return state;
  }
};

const Exam = () => {
  const { subjectCode, lang } = useParams();
  const navigate = useNavigate();
  const { isExamActive, setIsExamActive } = useExam();
  const questionRefs = useRef([]);
  const [state, dispatch] = useReducer(reducer, initialState);
  const [acceptedRules, setAcceptedRules] = useState(false);
  const roomId = useRef(null);
  const examContentRef = useRef(null);

  // Add function to save answers to localStorage
  const saveAnswersToLocalStorage = useCallback(
    (answers) => {
      try {
        localStorage.setItem(
          `exam_answers_${subjectCode}`,
          JSON.stringify(answers)
        );
      } catch (error) {
        console.error("Error saving answers to localStorage:", error);
      }
    },
    [subjectCode]
  );

  // Add function to save question IDs to localStorage
  const saveQuestionIdsToLocalStorage = useCallback(
    (questions) => {
      try {
        const questionIds = questions.map((q) => q.id);
        localStorage.setItem(
          `exam_questions_${subjectCode}`,
          JSON.stringify(questionIds)
        );
      } catch (error) {
        console.error("Error saving question IDs to localStorage:", error);
      }
    },
    [subjectCode]
  );

  // Add function to load question IDs from localStorage
  const loadQuestionIdsFromLocalStorage = useCallback(() => {
    try {
      const savedQuestionIds = localStorage.getItem(
        `exam_questions_${subjectCode}`
      );
      return savedQuestionIds ? JSON.parse(savedQuestionIds) : null;
    } catch (error) {
      console.error("Error loading question IDs from localStorage:", error);
      return null;
    }
  }, [subjectCode]);

  // Add function to clear saved answers and questions
  const clearSavedExamData = useCallback(() => {
    try {
      localStorage.removeItem(`exam_answers_${subjectCode}`);
      localStorage.removeItem(`exam_questions_${subjectCode}`);
    } catch (error) {
      console.error("Error clearing saved exam data:", error);
    }
  }, [subjectCode]);

  // Add function to load answers from localStorage
  const loadAnswersFromLocalStorage = useCallback(() => {
    try {
      const savedAnswers = localStorage.getItem(`exam_answers_${subjectCode}`);
      if (savedAnswers) {
        const parsedAnswers = JSON.parse(savedAnswers);
        dispatch({ type: "SET_ANSWER", payload: parsedAnswers });
        return true;
      }
    } catch (error) {
      console.error("Error loading answers from localStorage:", error);
    }
    return false;
  }, [subjectCode]);

  const handleSubmit = useCallback(() => {
    if (state.submitted) {
      console.log("Exam already submitted, preventing resubmission");
      return;
    }

    console.log("Submitting exam with answers:", state.answers);
    dispatch({ type: "SUBMIT_EXAM" });
    setIsExamActive(false);

    // Format answers for submission
    const formattedAnswers = state.questions.map((q) => ({
      questionId: q.id,
      selectedOption: state.answers[q.id] ?? -1,
    }));

    console.log("Formatted answers for submission:", formattedAnswers);

    // Submit exam directly without PDF generation
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
        clearSavedExamData(); // Clear both answers and question IDs after successful submission

        // Get pre-exam score from localStorage
        const subjects = JSON.parse(localStorage.getItem("subjects")) || [];
        const currentSubject = subjects.find(
          (s) => s["Fənnin kodu"] === subjectCode
        );
        const preExam = currentSubject ? currentSubject["Pre-Exam"] || 0 : 0;
        dispatch({ type: "SET_PRE_EXAM", payload: preExam });
      })
      .catch((err) => {
        console.error("Submission error:", err);
        toast.error(`İmtahanı təhvil vermək mümkün olmadı: ${err.message}`);
        dispatch({ type: "SET_ERROR", payload: err.message });
      })
      .finally(() => dispatch({ type: "STOP_SUBMITTING" }));
  }, [state, subjectCode, setIsExamActive, clearSavedExamData]);

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
      fetchQuestions().then(() => {
        // Try to load saved answers after questions are fetched
        const hasSavedAnswers = loadAnswersFromLocalStorage();
        if (hasSavedAnswers) {
          toast.info("Əvvəlki cavablarınız yükləndi.", {
            position: "top-center",
            autoClose: 5000,
          });
        }
      });
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
      // Try to get saved question IDs first
      const savedQuestionIds = loadQuestionIdsFromLocalStorage();

      let response;
      if (savedQuestionIds) {
        // If we have saved question IDs, fetch those specific questions
        response = await fetch(
          `${API_BASE}/questions/${subjectCode}/${lang}?questionIds=${savedQuestionIds.join(
            ","
          )}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
      } else {
        // Otherwise fetch random questions as usual
        response = await fetch(`${API_BASE}/questions/${subjectCode}/${lang}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
      }

      if (response.status === 403) {
        throw new Error("You have already taken this exam.");
      }
      if (!response.ok) {
        throw new Error("Failed to fetch questions");
      }

      const data = await response.json();
      dispatch({ type: "SET_QUESTIONS", payload: data });

      // Save question IDs if this is a new exam session
      if (!savedQuestionIds) {
        saveQuestionIdsToLocalStorage(data);
      }
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err.message });
    }
  };

  const handleSubmitRef = useRef(() => {});
  const submittedRef = useRef(false);
  const visibilitySubmittedRef = useRef(false);

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  useEffect(() => {
    submittedRef.current = state.submitted;
  }, [state.submitted]);

  const forceSubmitHandler = () => {
    console.log("Received force-submit event");
    if (!submittedRef.current) {
      console.log("Processing force submit...");
      submittedRef.current = true;
      setIsExamActive(false);

      // Show warning to student
      toast.warn(
        "İmtahan admin tərəfindən dayandırıldı. İmtahan 0 bal ilə təhvil verildi.",
        {
          position: "top-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        }
      );

      // Immediately mark as submitted with 0 points and show popup
      console.log("Dispatching FORCE_SUBMIT action");
      dispatch({ type: "FORCE_SUBMIT", payload: 0 });
      console.log("Dispatching SET_SCORE action");
      dispatch({ type: "SET_SCORE", payload: 0 });

      // Show popup immediately
      dispatch({ type: "SHOW_POPUP" });

      // Navigate to review page after a short delay
      console.log("Setting up navigation timeout");
      setTimeout(() => {
        console.log("Navigating to review page");
        navigate(`/review/${subjectCode}`);
      }, 2000);
    } else {
      console.log("Ignoring force-submit, already submitted");
    }
  };

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
      toast.success(`İmtahan vaxtı ${extraMinutes} dəqiqə artırıldı!`, {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
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
        // Join the room using the room ID
        socket.emit("join_room", roomId.current);
      }
    };

    const reconnectHandler = () => {
      console.log("Socket reconnected!");
      if (state.examStarted) {
        console.log("Rejoining exam room after reconnect:", roomId.current);
        // Join the room using the room ID
        socket.emit("join_room", roomId.current);
        toast.info("İmtahan bağlantısı bərpa olundu.");
      }
    };

    // Set up socket listeners
    console.log("Setting up socket listeners");
    socket.on("connect", connectHandler);
    socket.on("reconnect", reconnectHandler);
    socket.on("reconnect_error", (error) => {
      console.error("Reconnect error:", error);
      toast.error("Bağlantı bərpa edilə bilmədi.");
    });
    socket.on("error", errorHandler);

    // Remove any existing listeners first
    socket.off("force_submit");
    // Add the force submit listener
    socket.on("force_submit", forceSubmitHandler);

    socket.on("extend_time", extendTimeHandler);
    socket.on("update_time", updateTimeHandler);

    // Join exam room on mount
    if (state.examStarted && socket.connected) {
      console.log("Initially joining exam room:", roomId.current);
      // Join the room using the room ID
      socket.emit("join_room", roomId.current);
    }

    // Debug socket connection
    console.log("Socket connection status:", {
      connected: socket.connected,
      id: socket.id,
      roomId: roomId.current,
    });

    return () => {
      console.log("Cleaning up socket listeners");
      socket.off("connect", connectHandler);
      socket.off("reconnect", reconnectHandler);
      socket.off("reconnect_error");
      socket.off("error", errorHandler);
      socket.off("force_submit", forceSubmitHandler);
      socket.off("extend_time", extendTimeHandler);
      socket.off("update_time", updateTimeHandler);
    };
  }, [subjectCode, navigate, state.examStarted, setIsExamActive]);

  // Add socket connection status check
  useEffect(() => {
    if (state.examStarted) {
      const checkConnection = () => {
        console.log("Socket connection check:", {
          connected: socket.connected,
          id: socket.id,
          roomId: roomId.current,
        });
      };

      // Check immediately
      checkConnection();

      // And every 5 seconds
      const interval = setInterval(checkConnection, 5000);

      return () => clearInterval(interval);
    }
  }, [state.examStarted]);

  const handleAnswer = (questionId, optionIndex) => {
    if (state.examStarted && state.timeLeft > 0 && !state.submitted) {
      const newAnswers = { ...state.answers, [questionId]: optionIndex };
      dispatch({ type: "SET_ANSWER", payload: { [questionId]: optionIndex } });
      saveAnswersToLocalStorage(newAnswers);
    }
  };

  useBeforeUnload(
    useCallback(
      (e) => {
        if (state.examStarted && !state.submitted) {
          // Show warning toast instead of submitting
          toast.warning("İmtahan səhifəsindən çıxmaq istədiyinizə əminsiniz?", {
            position: "top-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          e.preventDefault();
          e.returnValue = "Are you sure you want to leave?";
        }
      },
      [state.examStarted, state.submitted]
    )
  );

  // Add context menu prevention
  useEffect(() => {
    const handleContextMenu = (e) => {
      if (state.examStarted && !state.submitted) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [state.examStarted, state.submitted]);

  // Submit exam with 0 points when student leaves the page
  const submitWithZeroPoints = useCallback(() => {
    if (submittedRef.current || visibilitySubmittedRef.current) {
      return; // Already submitted
    }

    visibilitySubmittedRef.current = true;
    submittedRef.current = true;
    dispatch({ type: "SUBMIT_EXAM" });
    setIsExamActive(false);

    // Format answers - all as -1 (not answered) to get 0 points
    const formattedAnswers = state.questions.map((q) => ({
      questionId: q.id,
      selectedOption: -1, // Force all answers as not answered = 0 points
    }));

    console.log("Submitting exam with 0 points due to page visibility change");

    // Submit exam with 0 points
    fetch(`${API_BASE}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        subjectCode: subjectCode,
        answers: formattedAnswers,
        leftPage: true, // Flag to indicate student left the exam page
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        console.log("Zero-point submission successful");
        dispatch({ type: "SET_SCORE", payload: 0 });
        dispatch({ type: "SHOW_POPUP" });
        // Don't clear localStorage here - preserve questions and answers in case admin deletes result
        // localStorage will be cleared on successful normal submission

        // Get pre-exam score from localStorage
        const subjects = JSON.parse(localStorage.getItem("subjects")) || [];
        const currentSubject = subjects.find(
          (s) => s["Fənnin kodu"] === subjectCode
        );
        const preExam = currentSubject ? currentSubject["Pre-Exam"] || 0 : 0;
        dispatch({ type: "SET_PRE_EXAM", payload: preExam });

        toast.error(
          "İmtahan səhifəsindən çıxdığınız üçün imtahan 0 bal ilə təhvil verildi!",
          {
            position: "top-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          }
        );

        // Navigate to review page after a short delay
        setTimeout(() => {
          navigate(`/review/${subjectCode}`);
        }, 2000);
      })
      .catch((err) => {
        console.error("Zero-point submission error:", err);
        toast.error(`İmtahanı təhvil vermək mümkün olmadı: ${err.message}`);
        dispatch({ type: "SET_ERROR", payload: err.message });
      })
      .finally(() => dispatch({ type: "STOP_SUBMITTING" }));
  }, [state.questions, subjectCode, setIsExamActive, navigate]);

  // Add visibility change handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        state.examStarted &&
        !state.submitted &&
        !visibilitySubmittedRef.current &&
        document.hidden
      ) {
        // Immediately submit with 0 points when page becomes hidden
        submitWithZeroPoints();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [state.examStarted, state.submitted, submitWithZeroPoints]);

  useEffect(() => {
    let timer;
    if (state.examStarted && state.timeLeft > 0 && !state.submitted) {
      timer = setInterval(() => dispatch({ type: "DECREMENT_TIME" }), 1000);
    } else if (state.timeLeft <= 0 && state.examStarted && !state.submitted) {
      // Show warning toast
      toast.warning(
        "İmtahan vaxtı bitdi! Cavablarınız avtomatik olaraq yadda saxlanılır...",
        {
          position: "top-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        }
      );

      // Set exam as inactive immediately
      setIsExamActive(false);

      // Submit the exam normally
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
          console.log("Time expired submission successful, score:", data.score);
          dispatch({ type: "SET_SCORE", payload: data.score });
          dispatch({ type: "SHOW_POPUP" });
          // Only clear localStorage if score > 0 (successful submission with answers)
          // If score is 0, preserve localStorage in case admin deletes record and student re-enters
          if (data.score > 0) {
            clearSavedExamData();
          }

          // Get pre-exam score from localStorage
          const subjects = JSON.parse(localStorage.getItem("subjects")) || [];
          const currentSubject = subjects.find(
            (s) => s["Fənnin kodu"] === subjectCode
          );
          const preExam = currentSubject ? currentSubject["Pre-Exam"] || 0 : 0;
          dispatch({ type: "SET_PRE_EXAM", payload: preExam });

          // Navigate to review page after a short delay
          setTimeout(() => {
            navigate(`/review/${subjectCode}`);
          }, 2000);
        })
        .catch((err) => {
          console.error("Time expired submission error:", err);
          toast.error(`İmtahanı təhvil vermək mümkün olmadı: ${err.message}`);
          dispatch({ type: "SET_ERROR", payload: err.message });
        });
    }
    return () => clearInterval(timer);
  }, [
    state.examStarted,
    state.timeLeft,
    state.submitted,
    state.questions,
    state.answers,
    subjectCode,
    navigate,
    clearSavedExamData,
    setIsExamActive,
  ]);

  const scrollToQuestion = (index) => {
    questionRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const handleSubmitClick = () => {
    dispatch({ type: "SHOW_CONFIRM_MODAL" });
  };

  const handleConfirmSubmit = () => {
    dispatch({ type: "HIDE_CONFIRM_MODAL" });
    handleSubmit();
  };

  const handleCancelSubmit = () => {
    dispatch({ type: "HIDE_CONFIRM_MODAL" });
  };

  // Format time for display
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return {
      hours: String(hours).padStart(2, "0"),
      minutes: String(minutes).padStart(2, "0"),
      seconds: String(secs).padStart(2, "0"),
    };
  };

  const timeDisplay = formatTime(state.timeLeft);
  const showFixedTimer =
    state.examStarted && state.timeLeft <= 300 && !state.submitted; // 5 minutes = 300 seconds

  return (
    <div className="container mx-auto px-4 py-8 flex">
      {/* Fixed Timer Banner - Shows when 5 minutes or less remain */}
      {showFixedTimer && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white shadow-2xl animate-pulse">
          <div className="container mx-auto px-4 py-4 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 mr-3 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-center">
              <div className="text-sm font-medium mb-1">QALAN VAXT</div>
              <div className="text-4xl font-bold tracking-wider">
                {timeDisplay.minutes}:{timeDisplay.seconds}
              </div>
              <div className="text-xs mt-1 opacity-90">
                Zəhmət olmasa imtahanı vaxtında təhvil verin!
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className="flex-grow"
        ref={examContentRef}
        style={{ marginTop: showFixedTimer ? "80px" : "0" }}
      >
        {!state.examStarted ? (
          <ExamRules
            acceptedRules={acceptedRules}
            setAcceptedRules={setAcceptedRules}
            onStartExam={handleStartExam}
          />
        ) : (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">İmtahan</h2>

            <div
              className={`text-xl font-semibold mb-6 p-4 rounded-lg ${
                state.timeLeft <= 300
                  ? "bg-red-100 text-red-800 border-2 border-red-400"
                  : "text-gray-800 bg-indigo-50"
              }`}
            >
              Qalan vaxt:{" "}
              <span className="font-bold">
                {timeDisplay.hours}:{timeDisplay.minutes}:{timeDisplay.seconds}
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
              onClick={handleSubmitClick}
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
        <div className="fixed top-20 -right-64 w-64 p-4 bg-white border border-gray-200 shadow-xl rounded-2xl transition-all duration-300 hover:right-4 group">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 bg-white p-2 rounded-l-lg shadow-lg border border-gray-200 border-r-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
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
          preExam={state.preExam}
          onClose={() => navigate(`/review/${subjectCode}`)}
        />
      )}

      {state.showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl transform transition-all animate-scaleIn">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-yellow-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                İmtahanı bitirmək istədiyinizə əminsiniz?
              </h3>
              <p className="text-gray-600 text-lg">
                İmtahanı bitirdikdən sonra cavablarınızı dəyişmək mümkün
                olmayacaq.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleCancelSubmit}
                className="flex-1 py-3 px-6 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 cursor-pointer"
              >
                Ləğv et
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="flex-1 py-3 px-6 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 cursor-pointer"
              >
                Bəli, bitir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exam;
