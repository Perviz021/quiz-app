import { useEffect, useRef, useCallback, useReducer, useState } from "react";
import { useBeforeUnload, useNavigate, useParams } from "react-router-dom";
import Popup from "../components/Popup";
import ExamRules from "../components/ExamRules";
import { useExam } from "../context/ExamContext";
import API_BASE from "../config/api";
import { io } from "socket.io-client";
import { toast } from "react-toastify";

// server.js serves uploads at /api/uploads (app.use("/api/uploads", express.static("uploads")))
// so the full image URL is: http://localhost:5000/api/uploads/questions/filename.jpg
const IMAGE_BASE = "http://localhost:5000";

const getImageUrl = (imageValue) => {
  if (!imageValue) return null;
  if (typeof imageValue !== "string") return null;
  if (imageValue.startsWith("http://") || imageValue.startsWith("https://")) {
    return imageValue;
  }
  if (imageValue.startsWith("uploads/")) {
    return `${IMAGE_BASE}/api/${imageValue}`;
  }
  if (imageValue.startsWith("/api/")) {
    return `${IMAGE_BASE}${imageValue}`;
  }
  if (imageValue.startsWith("api/uploads/")) {
    return `${IMAGE_BASE}/${imageValue}`;
  }
  return `${IMAGE_BASE}/api/${imageValue}`;
};

// Derive Socket.IO URL from VITE_API_BASE or use fallback
const SOCKET_SERVER_URL = import.meta.env.VITE_API_BASE
  ? import.meta.env.VITE_API_BASE.replace(/\/api$/, "")
  : "http://127.0.0.1";

const socket = io(SOCKET_SERVER_URL, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 30000,
  autoConnect: true,
});

// ─────────────────────────────────────────────
// Renders text and/or image together for any field
// ─────────────────────────────────────────────
const ContentBlock = ({ text, imagePath, prefix = "" }) => {
  const hasText = text && text.trim().length > 0;
  const hasImage = imagePath && imagePath.trim().length > 0;
  return (
    <span className="inline-block w-full">
      {hasText && (
        <span
          dangerouslySetInnerHTML={{
            __html: prefix ? `${prefix} ${text}` : text,
          }}
        />
      )}
      {!hasText && prefix && <span className="font-semibold">{prefix}</span>}
      {hasImage && (
        <img
          src={getImageUrl(imagePath) || undefined}
          alt="content"
          className="max-w-full max-h-64 object-contain rounded-lg mt-2 block"
        />
      )}
    </span>
  );
};

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
          JSON.stringify(answers),
        );
      } catch (error) {
        console.error("Error saving answers to localStorage:", error);
      }
    },
    [subjectCode],
  );

  // Add function to save question IDs to localStorage
  const saveQuestionIdsToLocalStorage = useCallback(
    (questions) => {
      try {
        const questionIds = questions.map((q) => q.id);
        localStorage.setItem(
          `exam_questions_${subjectCode}`,
          JSON.stringify(questionIds),
        );
      } catch (error) {
        console.error("Error saving question IDs to localStorage:", error);
      }
    },
    [subjectCode],
  );

  // Add function to load question IDs from localStorage
  const loadQuestionIdsFromLocalStorage = useCallback(() => {
    try {
      const savedQuestionIds = localStorage.getItem(
        `exam_questions_${subjectCode}`,
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
          (s) => s["Fənnin kodu"] === subjectCode,
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
            ",",
          )}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
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
        },
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
      [state.examStarted, state.submitted],
    ),
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
          (s) => s["Fənnin kodu"] === subjectCode,
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
          },
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
        },
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
            (s) => s["Fənnin kodu"] === subjectCode,
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

  const answeredCount = Object.keys(state.answers).length;
  const totalCount = state.questions.length;
  const progressPct =
    totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;
  const isLowTime = state.timeLeft <= 300;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ── Fixed red banner: last 5 minutes ── */}
      {showFixedTimer && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white shadow-2xl animate-pulse">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 animate-spin"
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
              <div className="text-xs font-semibold tracking-widest montserrat uppercase opacity-90">
                QALAN VAXT
              </div>
              <div className="text-3xl font-bold tracking-wider montserrat-700">
                {timeDisplay.minutes}:{timeDisplay.seconds}
              </div>
            </div>
            <p className="hidden sm:block text-sm opacity-90 inter ml-2">
              Zəhmət olmasa imtahanı vaxtında təhvil verin!
            </p>
          </div>
        </div>
      )}

      {/* ── ExamRules screen (before exam starts) ── */}
      {!state.examStarted ? (
        <ExamRules
          acceptedRules={acceptedRules}
          setAcceptedRules={setAcceptedRules}
          onStartExam={handleStartExam}
        />
      ) : (
        <div
          className="flex"
          style={{ paddingTop: showFixedTimer ? "80px" : "0" }}
          ref={examContentRef}
        >
          {/* ════════════════════════════════════════
              LEFT SIDEBAR — fixed, full height
          ════════════════════════════════════════ */}
          <aside className="fixed left-0 top-16 bottom-0 w-72 bg-navy shadow-2xl flex flex-col overflow-hidden z-40">
            {/* ── Timer section ── */}
            <div
              className={`px-5 py-4 border-b border-white/10 flex-shrink-0 ${isLowTime ? "bg-red-700/80" : "bg-navy-mid"}`}
            >
              <p className="text-gold text-xs font-bold tracking-widest uppercase montserrat mb-2 mt-[10px]">
                Qalan Vaxt
              </p>
              <div
                className={`font-mono font-bold tracking-wider text-center montserrat-700 ${isLowTime ? "text-red-200 text-4xl animate-pulse" : "text-white text-3xl"}`}
              >
                {timeDisplay.hours}:{timeDisplay.minutes}:{timeDisplay.seconds}
              </div>
              {isLowTime && (
                <p className="text-red-300 text-xs text-center mt-1 inter">
                  Son 5 dəqiqə!
                </p>
              )}
            </div>

            {/* ── Progress bar ── */}
            <div className="px-5 py-3 border-b border-white/10 flex-shrink-0">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-slate-300 text-xs inter">Cavablandı</span>
                <span className="text-white text-xs font-bold montserrat-700">
                  {answeredCount} / {totalCount}
                </span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* ── Question navigation grid ── */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase montserrat mb-3">
                Sual Naviqasiyası
              </p>

              {/* Legend */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-400 text-xs inter">
                    Cavablandı
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-white/20" />
                  <span className="text-slate-400 text-xs inter">Boş</span>
                </div>
              </div>

              {/* 10×5 grid for 50 questions */}
              <div className="grid grid-cols-5 gap-1.5">
                {state.questions.map((q, index) => {
                  const isAnswered = q.id in state.answers;
                  return (
                    <button
                      key={q.id}
                      onClick={() => scrollToQuestion(index)}
                      title={`Sual ${index + 1}${isAnswered ? " ✓" : ""}`}
                      className={`w-full aspect-square flex items-center justify-center rounded-lg text-xs font-bold montserrat-700 transition-all duration-150 hover:scale-110 ${
                        isAnswered
                          ? "bg-emerald-500 text-white hover:bg-emerald-400"
                          : "bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white"
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Submit button ── */}
            <div className="p-4 border-t border-white/10 flex-shrink-0 bg-navy">
              <button
                onClick={handleSubmitClick}
                disabled={state.submitted || state.isSubmitting}
                className={`w-full py-3 px-4 rounded-xl text-sm font-bold montserrat-700 tracking-wide transition-all duration-200 flex items-center justify-center gap-2 ${
                  state.submitted || state.isSubmitting
                    ? "bg-white/10 text-slate-500 cursor-not-allowed"
                    : "bg-gold hover:bg-gold-light text-navy cursor-pointer shadow-lg shadow-gold/20 hover:-translate-y-0.5"
                }`}
              >
                {state.isSubmitting ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Yadda saxlanılır...
                  </>
                ) : state.submitted ? (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    İmtahan sonlandı
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    İmtahanı Bitir
                  </>
                )}
              </button>

              {/* Unanswered warning */}
              {!state.submitted &&
                answeredCount < totalCount &&
                totalCount > 0 && (
                  <p className="text-amber-400 text-xs text-center mt-2 inter">
                    {totalCount - answeredCount} sual cavablanmayıb
                  </p>
                )}
            </div>
          </aside>

          {/* ════════════════════════════════════════
              MAIN CONTENT — offset by sidebar width
          ════════════════════════════════════════ */}
          <main className="flex-1 ml-72 min-h-screen px-6 py-6">
            {/* Page title */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-navy montserrat-700">
                  İmtahan
                </h2>
                <p className="text-slate-500 text-sm inter mt-0.5">
                  {subjectCode} ·{" "}
                  {lang === "az" ? "Azərbaycan dili" : "English"}
                </p>
              </div>
              <div
                className={`px-4 py-2 rounded-xl text-sm font-bold montserrat-700 border ${
                  isLowTime
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-navy/5 border-navy/20 text-navy"
                }`}
              >
                {timeDisplay.hours}:{timeDisplay.minutes}:{timeDisplay.seconds}
              </div>
            </div>

            {/* Error state */}
            {state.error ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                <svg
                  className="w-8 h-8 text-red-500 mx-auto mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-red-700 font-semibold montserrat-600">
                  {state.error}
                </p>
              </div>
            ) : (
              /* Questions list */
              <div className="space-y-5 max-w-3xl">
                {state.questions.map((q, index) => {
                  const isAnswered = q.id in state.answers;
                  return (
                    <div
                      key={q.id}
                      ref={(el) => (questionRefs.current[index] = el)}
                      className={`bg-white rounded-2xl shadow-sm border transition-all duration-200 overflow-hidden ${
                        isAnswered
                          ? "border-emerald-200 shadow-emerald-50"
                          : "border-slate-200 hover:border-slate-300 hover:shadow-md"
                      }`}
                    >
                      {/* Question header strip */}
                      <div
                        className={`px-5 py-2.5 flex items-center justify-between border-b ${
                          isAnswered
                            ? "bg-emerald-50 border-emerald-100"
                            : "bg-slate-50 border-slate-100"
                        }`}
                      >
                        <span
                          className={`text-xs font-bold montserrat-700 uppercase tracking-wider ${
                            isAnswered ? "text-emerald-700" : "text-slate-500"
                          }`}
                        >
                          Sual {index + 1}
                        </span>
                        {isAnswered && (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold inter">
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Cavablandı
                          </span>
                        )}
                      </div>

                      {/* Question body */}
                      <div className="p-5">
                        <p className="font-semibold text-gray-900 text-base leading-relaxed inter mb-4">
                          <ContentBlock
                            text={q.question}
                            imagePath={q.question_image}
                            prefix={`${index + 1}.`}
                          />
                        </p>

                        {/* Options */}
                        <div className="space-y-2">
                          {[
                            { text: q.option1, image: q.option1_image },
                            { text: q.option2, image: q.option2_image },
                            { text: q.option3, image: q.option3_image },
                            { text: q.option4, image: q.option4_image },
                            { text: q.option5, image: q.option5_image },
                          ].map((option, optionIndex) => {
                            const hasContent = option.text || option.image;
                            if (!hasContent) return null;
                            const isSelected =
                              state.answers[q.id] === optionIndex + 1;
                            const optionLetter = String.fromCharCode(
                              65 + optionIndex,
                            ); // A B C D E
                            return (
                              <label
                                key={optionIndex}
                                className={`flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all duration-150 ${
                                  isSelected
                                    ? "bg-navy/5 border-navy text-navy"
                                    : "bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                {/* Letter badge */}
                                <span
                                  className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold montserrat-700 mt-0.5 transition-colors ${
                                    isSelected
                                      ? "bg-navy text-white"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  {optionLetter}
                                </span>

                                {/* Hidden radio (logic preserved) */}
                                <input
                                  type="radio"
                                  name={`question-${q.id}`}
                                  value={optionIndex}
                                  checked={isSelected}
                                  onChange={() =>
                                    handleAnswer(q.id, optionIndex + 1)
                                  }
                                  className="sr-only"
                                />

                                <span className="text-gray-700 flex-1 text-sm inter leading-relaxed">
                                  <ContentBlock
                                    text={option.text}
                                    imagePath={option.image}
                                  />
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Bottom spacer so last question isn't hidden behind nothing */}
                <div className="h-8" />
              </div>
            )}
          </main>
        </div>
      )}

      {/* ════════════════════════════════
          CONFIRM SUBMIT MODAL
      ════════════════════════════════ */}
      {state.showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="h-8 w-8 text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-navy montserrat-700 mb-2">
                İmtahanı bitirmək istədiyinizə əminsiniz?
              </h3>
              <p className="text-slate-500 text-sm inter leading-relaxed">
                İmtahanı bitirdikdən sonra cavablarınızı dəyişmək mümkün
                olmayacaq.
              </p>

              {/* Stats */}
              <div className="mt-4 flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600 montserrat-700">
                    {answeredCount}
                  </p>
                  <p className="text-xs text-slate-400 inter">Cavablandı</p>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-500 montserrat-700">
                    {totalCount - answeredCount}
                  </p>
                  <p className="text-xs text-slate-400 inter">Boş qaldı</p>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-navy montserrat-700">
                    {totalCount}
                  </p>
                  <p className="text-xs text-slate-400 inter">Cəmi</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancelSubmit}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold montserrat-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 cursor-pointer"
              >
                Ləğv et
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white font-bold montserrat-700 hover:bg-red-700 transition-all duration-200 cursor-pointer shadow-lg shadow-red-600/20"
              >
                Bəli, bitir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          RESULT POPUP
      ════════════════════════════════ */}
      {state.showPopup && (
        <Popup
          score={state.score}
          preExam={state.preExam}
          onClose={() => navigate(`/review/${subjectCode}`)}
        />
      )}
    </div>
  );
};

export default Exam;
