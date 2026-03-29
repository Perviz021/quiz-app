import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useState, useEffect, Suspense, lazy } from "react";
import Navbar from "./components/Navbar";
import { ExamProvider } from "./context/ExamContext.jsx";
import { ToastContainer } from "react-toastify";

// ─────────────────────────────────────────────────────────────────────────────
// Decode the JWT payload WITHOUT verifying the signature.
// We only use this for ROUTING decisions (what UI to show).
// Every sensitive backend call still goes through the server-side
// `authenticate` middleware which re-reads status from the DB,
// so a tampered payload cannot grant real privileges.
//
// The payload is base64url-encoded — it is NOT encrypted.
// Decoding it here is safe and does not require the secret.
// ─────────────────────────────────────────────────────────────────────────────
const decodeJwtPayload = (token) => {
  try {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // base64url → base64 → JSON
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
};

// Read status from the JWT, not localStorage.
// A user changing localStorage.status cannot forge a signed token.
const getStatusFromToken = (token) => {
  const payload = decodeJwtPayload(token);
  return payload?.status ?? null;
};

// Is the token expired (client-side check — backend also enforces this)?
const isTokenExpired = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return Date.now() / 1000 > payload.exp;
};

// Lazy load pages
const Home            = lazy(() => import("./pages/Home"));
const Exam            = lazy(() => import("./pages/Exam"));
const Results         = lazy(() => import("./pages/Results"));
const Login           = lazy(() => import("./pages/Login"));
const AdminDashboard  = lazy(() => import("./pages/AdminDashboard"));
const Review          = lazy(() => import("./pages/Review"));
const AddQuestion     = lazy(() => import("./pages/AddQuestion"));
const ExportQuestions = lazy(() => import("./pages/ExportQuestions"));
const EditQuestions   = lazy(() => import("./pages/EditQuestions"));
const Protocol        = lazy(() => import("./pages/Protocol"));
const EditProtocol    = lazy(() => import("./pages/EditProtocol"));
const ExportProtocol  = lazy(() => import("./pages/ExportProtocol"));
const ResultsByDate   = lazy(() => import("./pages/ResultsByDate"));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-100">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 rounded-full border-4 border-navy/20 border-t-navy animate-spin" />
      <p className="text-slate-400 text-sm inter">Yüklənir...</p>
    </div>
  </div>
);

const App = () => {
  const [token, setToken] = useState(() => {
    const t = localStorage.getItem("token");
    // Treat an expired token as absent
    return t && !isTokenExpired(t) ? t : null;
  });

  const [subjects, setSubjects] = useState(
    () => JSON.parse(localStorage.getItem("subjects")) || []
  );

  // ── Derive status from JWT — never trust localStorage.status ──────────────
  // Even if someone edits localStorage.status, this value comes from the
  // cryptographically signed token, so it cannot be forged on the client.
  const status = getStatusFromToken(token);

  // Sync localStorage.status to match the real JWT value so that Navbar
  // and other components that still read localStorage get the correct value.
  useEffect(() => {
    if (status) {
      localStorage.setItem("status", status);
    } else {
      localStorage.removeItem("status");
    }
  }, [status]);

  // When the token changes (login / logout), re-read subjects
  useEffect(() => {
    if (!token) {
      setSubjects([]);
      return;
    }
    if (isTokenExpired(token)) {
      // Token expired while app was open — force logout
      setToken(null);
      localStorage.clear();
    }
  }, [token]);

  // Periodically check token expiry while the app is open
  useEffect(() => {
    const interval = setInterval(() => {
      const stored = localStorage.getItem("token");
      if (stored && isTokenExpired(stored)) {
        setToken(null);
        localStorage.clear();
      }
    }, 60_000); // check every minute
    return () => clearInterval(interval);
  }, []);

  const handleSetToken = (newToken) => {
    setToken(newToken);
  };

  return (
    <ExamProvider>
      <Router>
        {token && <Navbar />}
        <div>
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* ── Public ── */}
              <Route
                path="/login"
                element={
                  token ? (
                    // Already logged in → redirect to their home
                    <Navigate
                      to={
                        status === "staff"
                          ? "/admin"
                          : status === "teacher"
                          ? "/teacher"
                          : "/"
                      }
                      replace
                    />
                  ) : (
                    <Login setToken={handleSetToken} setSubjects={setSubjects} />
                  )
                }
              />

              {/* ── Student routes ── */}
              {status === "student" && (
                <>
                  <Route path="/"                        element={<Home subjects={subjects} />} />
                  <Route path="/exam/:subjectCode/:lang" element={<Exam />} />
                  <Route path="/results"                 element={<Results />} />
                  <Route path="/review/:subjectCode"     element={<Review />} />
                </>
              )}

              {/* ── Admin routes ── */}
              {status === "staff" && (
                <>
                  <Route path="/admin"                              element={<AdminDashboard />} />
                  <Route path="/admin/add-question"                 element={<AddQuestion />} />
                  <Route path="/admin/export-questions"             element={<ExportQuestions />} />
                  <Route path="/admin/protocol"                     element={<Protocol />} />
                  <Route path="/edit-questions/:subjectCode/:lang"  element={<EditQuestions />} />
                  <Route path="/edit-protocol/:fennQrupu"           element={<EditProtocol />} />
                  <Route path="/admin/export-protocol/:fennQrupu"   element={<ExportProtocol />} />
                  <Route path="/admin/results-by-date"              element={<ResultsByDate />} />
                </>
              )}

              {/* ── Teacher routes ── */}
              {status === "teacher" && (
                <>
                  <Route path="/teacher"                           element={<Home subjects={subjects} />} />
                  <Route path="/edit-questions/:subjectCode/:lang" element={<EditQuestions />} />
                </>
              )}

              {/* ── Catch-all: redirect to role home or login ── */}
              <Route
                path="*"
                element={
                  !token ? (
                    <Navigate to="/login" replace />
                  ) : status === "staff" ? (
                    <Navigate to="/admin" replace />
                  ) : status === "teacher" ? (
                    <Navigate to="/teacher" replace />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </ExamProvider>
  );
};

export default App;
