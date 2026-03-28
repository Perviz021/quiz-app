import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API_BASE from "../config/api";

// ── Same image resolver used in Exam.jsx ────────────────────────────────────
const IMAGE_BASE = "http://localhost:5000";

const getImageUrl = (imageValue) => {
  if (!imageValue) return null;
  if (typeof imageValue !== "string") return null;
  if (imageValue.startsWith("http://") || imageValue.startsWith("https://"))
    return imageValue;
  if (imageValue.startsWith("uploads/"))
    return `${IMAGE_BASE}/api/${imageValue}`;
  if (imageValue.startsWith("/api/"))
    return `${IMAGE_BASE}${imageValue}`;
  if (imageValue.startsWith("api/uploads/"))
    return `${IMAGE_BASE}/${imageValue}`;
  return `${IMAGE_BASE}/api/${imageValue}`;
};

// ── Renders text and/or image together — identical to Exam.jsx ──────────────
const ContentBlock = ({ text, imagePath, prefix = "" }) => {
  const hasText  = text      && text.trim().length > 0;
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

// ── Option colour logic (unchanged from original) ────────────────────────────
const getOptionStyle = (optText, optImage, question) => {
  // Determine which option slot the student selected and which is correct
  const opts = [
    { text: question.option1, image: question.option1_image },
    { text: question.option2, image: question.option2_image },
    { text: question.option3, image: question.option3_image },
    { text: question.option4, image: question.option4_image },
    { text: question.option5, image: question.option5_image },
  ];

  const optIndex   = opts.findIndex((o) => o.text === optText && o.image === optImage);
  const slotNumber = optIndex + 1; // 1-based

  const selected = question.selected_option; // 1-based, -1 = unanswered
  const correct  = question.correct_option;  // 1-based

  const isCorrectSlot  = slotNumber === correct;
  const isSelectedSlot = slotNumber === selected;

  if (isSelectedSlot && isCorrectSlot)
    return { border: "border-emerald-400", bg: "bg-emerald-50", text: "text-emerald-800", badge: "bg-emerald-500", label: "Düzgün" };
  if (isSelectedSlot && !isCorrectSlot)
    return { border: "border-red-400",     bg: "bg-red-50",     text: "text-red-800",     badge: "bg-red-500",     label: "Yanlış"  };
  if (!isSelectedSlot && isCorrectSlot)
    return { border: "border-amber-400",   bg: "bg-amber-50",   text: "text-amber-800",   badge: "bg-amber-500",   label: "Düzgün"  };

  return { border: "border-slate-200", bg: "bg-white", text: "text-slate-700", badge: null, label: null };
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const getOptionLetter = (index) => String.fromCharCode(65 + index); // A B C D E

const getAnswerSummary = (questions) =>
  questions.map((q, index) => {
    const correctAnswer  = getOptionLetter(q.correct_option - 1);
    const studentAnswer  = q.selected_option === -1 ? "–" : getOptionLetter(q.selected_option - 1);
    const isCorrect      = q.selected_option === q.correct_option;
    return { questionNumber: index + 1, correctAnswer, studentAnswer, isCorrect };
  });

// ── Main component ────────────────────────────────────────────────────────────
const Review = () => {
  const { subjectCode }     = useParams();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [showSummary, setShowSummary] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/review/${subjectCode}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load review data");
        return res.json();
      })
      .then((data) => { setQuestions(data); setLoading(false); })
      .catch((err) => { console.error(err); setError(err.message); setLoading(false); });
  }, [subjectCode]);

  // Quick stats
  const correct   = questions.filter((q) => q.selected_option === q.correct_option).length;
  const wrong     = questions.filter((q) => q.selected_option !== -1 && q.selected_option !== q.correct_option).length;
  const skipped   = questions.filter((q) => q.selected_option === -1).length;
  const total     = questions.length;
  const pctScore  = total > 0 ? Math.round((correct / total) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-navy/20 border-t-navy animate-spin" />
          <p className="text-slate-500 inter text-sm">Yüklənir...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-700 font-semibold montserrat-600">{error}</p>
        </div>
      </div>
    );
  }

  const summary = getAnswerSummary(questions);

  return (
    <div className="min-h-screen bg-slate-100">

      {/* ── Page header ── */}
      <div className="bg-navy">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <p className="text-gold text-[11px] font-bold tracking-widest uppercase montserrat mb-1">
            BAAU İmtahan Sistemi
          </p>
          <h1 className="text-white text-2xl font-bold montserrat-700 mb-5">
            Cavabların Yoxlanması
          </h1>

          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { value: correct, label: "Düzgün",         color: "text-emerald-300", bg: "bg-emerald-400/20" },
              { value: wrong,   label: "Yanlış",          color: "text-red-300",     bg: "bg-red-400/20"     },
              { value: skipped, label: "Cavablanmamış",   color: "text-amber-300",   bg: "bg-amber-400/20"   },
              { value: `${pctScore}%`, label: "Düzgünlük dərəcəsi", color: "text-blue-200", bg: "bg-blue-400/20" },
            ].map(({ value, label, color, bg }) => (
              <div key={label} className={`${bg} border border-white/10 rounded-xl px-4 py-3`}>
                <p className={`text-2xl font-black montserrat-900 ${color}`}>{value}</p>
                <p className="text-slate-300 text-[11px] inter mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Wave divider */}
        <svg viewBox="0 0 1440 24" className="w-full block" preserveAspectRatio="none" style={{ height: "24px" }}>
          <path d="M0,24 C360,0 1080,0 1440,24 L1440,24 L0,24 Z" fill="#f1f5f9" />
        </svg>
      </div>

      {/* ── Content ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">

        {/* Toggle + legend row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs inter text-slate-600">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              Düzgün cavab
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              Yanlış cavab
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              Cavablanmamış
            </div>
          </div>

          <button
            onClick={() => setShowSummary(!showSummary)}
            className="flex items-center gap-2 bg-navy hover:bg-navy-light text-white text-xs font-bold montserrat-700 px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            {showSummary ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Detallı Baxış
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Xülasə
              </>
            )}
          </button>
        </div>

        {/* ── SUMMARY VIEW ── */}
        {showSummary && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-navy flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 className="text-sm font-bold text-slate-700 montserrat-700">Xülasə Cədvəli</h2>
            </div>

            <div className="p-4 overflow-x-auto">
              {Array.from({ length: Math.ceil(summary.length / 10) }).map((_, blockIdx) => {
                const block = summary.slice(blockIdx * 10, blockIdx * 10 + 10);
                return (
                  <table
                    key={blockIdx}
                    className="w-full border-collapse text-xs mb-4 last:mb-0"
                  >
                    <tbody>
                      {/* Question numbers */}
                      <tr>
                        <td className="pr-3 py-1.5 text-slate-400 inter font-medium w-28 whitespace-nowrap">№</td>
                        {block.map((item) => (
                          <td key={`num-${item.questionNumber}`} className="text-center px-1 py-1.5 font-bold text-navy montserrat-700">
                            {item.questionNumber}
                          </td>
                        ))}
                      </tr>

                      {/* Correct answers */}
                      <tr className="border-t border-slate-100">
                        <td className="pr-3 py-1.5 text-slate-400 inter font-medium whitespace-nowrap">Düzgün cavab</td>
                        {block.map((item) => (
                          <td key={`correct-${item.questionNumber}`} className="text-center px-1 py-1.5">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold montserrat-700 text-[11px]">
                              {item.correctAnswer}
                            </span>
                          </td>
                        ))}
                      </tr>

                      {/* Student answers */}
                      <tr className="border-t border-slate-100">
                        <td className="pr-3 py-1.5 text-slate-400 inter font-medium whitespace-nowrap">Sizin cavabınız</td>
                        {block.map((item) => (
                          <td key={`student-${item.questionNumber}`} className="text-center px-1 py-1.5">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold montserrat-700 text-[11px] ${
                              item.studentAnswer === "–"
                                ? "bg-amber-100 text-amber-700"
                                : item.isCorrect
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                              {item.studentAnswer}
                            </span>
                          </td>
                        ))}
                      </tr>

                      {/* Result icons */}
                      <tr className="border-t border-slate-100">
                        <td className="pr-3 py-1.5 text-slate-400 inter font-medium whitespace-nowrap">Nəticə</td>
                        {block.map((item) => (
                          <td key={`result-${item.questionNumber}`} className="text-center px-1 py-1.5">
                            {item.studentAnswer === "–" ? (
                              <span className="text-amber-500 text-base">—</span>
                            ) : item.isCorrect ? (
                              <svg className="w-4 h-4 text-emerald-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                );
              })}
            </div>
          </div>
        )}

        {/* ── DETAILED VIEW ── */}
        {!showSummary && (
          <div className="space-y-5 max-w-3xl">
            {questions.map((q, index) => {
              const isCorrect  = q.selected_option === q.correct_option;
              const isSkipped  = q.selected_option === -1;

              // card border colour based on result
              const cardBorder = isSkipped
                ? "border-amber-300"
                : isCorrect
                ? "border-emerald-300"
                : "border-red-300";

              const headerBg = isSkipped
                ? "bg-amber-50 border-amber-100"
                : isCorrect
                ? "bg-emerald-50 border-emerald-100"
                : "bg-red-50 border-red-100";

              const headerText = isSkipped
                ? "text-amber-700"
                : isCorrect
                ? "text-emerald-700"
                : "text-red-700";

              const statusLabel = isSkipped
                ? "Cavablanmamış"
                : isCorrect
                ? "Düzgün"
                : "Yanlış";

              const statusIcon = isSkipped ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : isCorrect ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              );

              const options = [
                { text: q.option1, image: q.option1_image },
                { text: q.option2, image: q.option2_image },
                { text: q.option3, image: q.option3_image },
                { text: q.option4, image: q.option4_image },
                { text: q.option5, image: q.option5_image },
              ];

              return (
                <div
                  key={q.questionId}
                  className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden ${cardBorder}`}
                >
                  {/* Question header strip */}
                  <div className={`px-5 py-2.5 flex items-center justify-between border-b ${headerBg}`}>
                    <span className={`text-xs font-bold montserrat-700 uppercase tracking-wider ${headerText}`}>
                      Sual {index + 1}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold inter ${headerText}`}>
                      {statusIcon}
                      {statusLabel}
                    </span>
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
                      {options.map((opt, optIdx) => {
                        const hasContent = opt.text || opt.image;
                        if (!hasContent) return null;

                        const style = getOptionStyle(opt.text, opt.image, q);
                        const letter = getOptionLetter(optIdx);

                        return (
                          <div
                            key={optIdx}
                            className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-colors ${style.border} ${style.bg}`}
                          >
                            {/* Letter badge */}
                            <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold montserrat-700 mt-0.5 ${
                              style.badge ? `${style.badge} text-white` : "bg-slate-100 text-slate-500"
                            }`}>
                              {letter}
                            </span>

                            <span className={`flex-1 text-sm inter leading-relaxed ${style.text}`}>
                              <ContentBlock text={opt.text} imagePath={opt.image} />
                            </span>

                            {/* Status pill */}
                            {style.label && (
                              <span className={`flex-shrink-0 text-[10px] font-bold montserrat-700 px-2 py-0.5 rounded-full self-start mt-1 ${
                                style.badge === "bg-emerald-500"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : style.badge === "bg-red-500"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}>
                                {style.label}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="h-8" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Review;
