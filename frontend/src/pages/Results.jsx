import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDate } from "../utils/dateFormatter";
import API_BASE from "../config/api";

// ── Letter grade + pass rules (same logic as Popup.jsx) ─────────────────────
const getLetterGrade = (score) => {
  const s = Number(score);
  if (s >= 91) return "A";
  if (s >= 81) return "B";
  if (s >= 71) return "C";
  if (s >= 61) return "D";
  if (s >= 51) return "E";
  return "F";
};

/** Yekun bal = imtahan + giriş; keçid üçün imtahan ≥ 17 və hərf qiyməti F deyil */
const getFinalScore = (examScore, preExam) =>
  Number(examScore) + Number(preExam ?? 0);

const isPassingResult = (examScore, preExam) => {
  const finalScore = getFinalScore(examScore, preExam);
  const letter = getLetterGrade(finalScore);
  return Number(examScore) >= 17 && letter !== "F";
};

const gradeStyle = {
  A: { bg: "bg-emerald-500", light: "bg-emerald-50",  text: "text-emerald-700",  border: "border-emerald-200" },
  B: { bg: "bg-blue-500",    light: "bg-blue-50",     text: "text-blue-700",     border: "border-blue-200"    },
  C: { bg: "bg-indigo-500",  light: "bg-indigo-50",   text: "text-indigo-700",   border: "border-indigo-200"  },
  D: { bg: "bg-amber-500",   light: "bg-amber-50",    text: "text-amber-700",    border: "border-amber-200"   },
  E: { bg: "bg-orange-500",  light: "bg-orange-50",   text: "text-orange-700",   border: "border-orange-200"  },
  F: { bg: "bg-red-500",     light: "bg-red-50",      text: "text-red-700",      border: "border-red-200"     },
};

// ── Small donut ring: arc = yekun bal / 100, letter from yekun bal ───────────
const ScoreRing = ({ finalScore }) => {
  const grade   = getLetterGrade(finalScore);
  const style   = gradeStyle[grade] || gradeStyle.F;
  const radius  = 18;
  const circ    = 2 * Math.PI * radius;
  const pct     = Math.min(Number(finalScore) / 100, 1);
  const dash    = `${(pct * circ).toFixed(1)} ${circ.toFixed(1)}`;

  // Inline stroke colour so we don't need arbitrary Tailwind values
  const strokeColor = {
    A: "#10b981", B: "#3b82f6", C: "#6366f1",
    D: "#f59e0b", E: "#f97316", F: "#ef4444",
  }[grade] || "#ef4444";

  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="5" />
        <circle
          cx="22" cy="22" r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={dash}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-[11px] font-black montserrat-900 ${style.text}`}>{grade}</span>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const Results = () => {
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const studentId = localStorage.getItem("studentId");

  useEffect(() => {
    fetch(`${API_BASE}/results/${studentId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => { setResults(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [studentId]);

  // Summary counts (yekun bal + minimum imtahan balı — Popup ilə eyni)
  const passed  = results.filter((r) => isPassingResult(r.score, r.preExam)).length;
  const failed  = results.length - passed;

  return (
    <div className="min-h-screen bg-slate-100">

      {/* ── Page header ── */}
      <div className="bg-navy">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <p className="text-gold text-[11px] font-bold tracking-widest uppercase montserrat mb-1">
            BAAU İmtahan Sistemi
          </p>
          <h1 className="text-white text-2xl font-bold montserrat-700 mb-5">
            İmtahan Nəticələri
          </h1>

          {/* Stats tiles — only shown once data loaded */}
          {!loading && results.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: results.length, label: "Cəmi imtahan",  color: "text-blue-200",    bg: "bg-blue-400/20"    },
                { value: passed,         label: "Keçildi",        color: "text-emerald-300", bg: "bg-emerald-400/20" },
                { value: failed,         label: "Kəsildi",        color: "text-red-300",     bg: "bg-red-400/20"     },
              ].map(({ value, label, color, bg }) => (
                <div key={label} className={`${bg} border border-white/10 rounded-xl px-4 py-3`}>
                  <p className={`text-2xl font-black montserrat-900 ${color}`}>{value}</p>
                  <p className="text-slate-300 text-[11px] inter mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Wave divider */}
        <svg viewBox="0 0 1440 24" className="w-full block" preserveAspectRatio="none" style={{ height: "24px" }}>
          <path d="M0,24 C360,0 1080,0 1440,24 L1440,24 L0,24 Z" fill="#f1f5f9" />
        </svg>
      </div>

      {/* ── Content ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-navy/20 border-t-navy animate-spin" />
            <p className="text-slate-500 inter text-sm">Yüklənir...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-navy/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-navy/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-slate-500 montserrat-600 text-base">Heç bir nəticə tapılmadı.</p>
          </div>
        ) : (

          /* ── Results cards ── */
          <div className="space-y-3">
            {results.map((result, index) => {
              const examScore   = Number(result.score);
              const preExam     = Number(result.preExam ?? 0);
              const finalScore  = getFinalScore(result.score, result.preExam);
              const grade       = getLetterGrade(finalScore);
              const style       = gradeStyle[grade] || gradeStyle.F;
              const isPassing   = isPassingResult(result.score, result.preExam);

              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all duration-200"
                >
                  <div className="flex items-center gap-4 px-5 py-4">

                    {/* Score ring (yekun bal əsasında) */}
                    <ScoreRing finalScore={finalScore} />

                    {/* Subject + dates */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-navy montserrat-700 truncate leading-tight mb-1">
                        {result["Fənnin adı"]}
                      </h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-400 inter">
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Başlandı: {formatDate(result["created_at"], "dd/MM/yyyy HH:mm:ss")}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Bitdi: {formatDate(result["submitted_at"], "dd/MM/yyyy HH:mm:ss")}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 inter mt-1">
                        İmtahan: <span className="font-semibold text-slate-700">{examScore}</span>
                        {" · "}
                        Giriş: <span className="font-semibold text-slate-700">{preExam}</span>
                      </p>
                    </div>

                    {/* Score badge — yekun bal */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${style.border} ${style.light}`}>
                        <span className={`text-base font-black montserrat-900 ${style.text}`}>
                          {finalScore}
                        </span>
                        <span className={`text-[10px] font-bold montserrat-700 ${style.text} opacity-70`}>
                          yekun bal
                        </span>
                      </div>

                      {/* Pass / fail chip */}
                      <span className={`text-[10px] font-bold montserrat-700 tracking-wider px-2 py-0.5 rounded-full ${
                        isPassing
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {isPassing ? "KEÇİLDİ" : "KƏSİLDİ"}
                      </span>
                    </div>

                    {/* Review link */}
                    <Link
                      to={`/review/${result["Fənnin kodu"]}`}
                      className="flex-shrink-0 flex items-center gap-1.5 bg-navy hover:bg-navy-light text-white text-xs font-bold montserrat-700 px-3 py-2 rounded-xl transition-colors duration-200"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Baxış
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Results;
