const Popup = ({ score, preExam, onClose }) => {
  const finalScore = Number(score) + Number(preExam || 0);
  const examScore = Number(score);

  const getLetterGrade = (score) => {
    if (score >= 91) return "A";
    if (score >= 81) return "B";
    if (score >= 71) return "C";
    if (score >= 61) return "D";
    if (score >= 51) return "E";
    return "F";
  };

  const letterGrade = getLetterGrade(finalScore);
  const isExamPassing = examScore >= 17;
  const isPassing = isExamPassing && letterGrade !== "F";

  const getMessage = () => {
    if (!isExamPassing)
      return "Təəssüf ki, imtahandan kəsildiniz. İmtahan balı 17-dən azdır.";
    if (!isPassing)
      return "Təəssüf ki, imtahandan kəsildiniz. Yekun bal kifayət qədər deyil.";
    switch (letterGrade) {
      case "A":
        return "Əla nəticə göstərdiniz!";
      case "B":
        return "Çox yaxşı nəticə göstərdiniz!";
      case "C":
        return "Yaxşı nəticə göstərdiniz!";
      case "D":
        return "Qənaətbəxş nəticə göstərdiniz!";
      case "E":
        return "İmtahandan keçdiniz!";
      default:
        return "";
    }
  };

  const handleClose = () => {
    console.log("Popup closed clicked");
    if (typeof onClose === "function") onClose();
  };

  // Grade-specific ring/accent colour
  const gradeColor = {
    A: {
      ring: "#10b981",
      bg: "bg-emerald-500",
      text: "text-emerald-600",
      light: "bg-emerald-50",
      border: "border-emerald-200",
    },
    B: {
      ring: "#3b82f6",
      bg: "bg-blue-500",
      text: "text-blue-600",
      light: "bg-blue-50",
      border: "border-blue-200",
    },
    C: {
      ring: "#6366f1",
      bg: "bg-indigo-500",
      text: "text-indigo-600",
      light: "bg-indigo-50",
      border: "border-indigo-200",
    },
    D: {
      ring: "#f59e0b",
      bg: "bg-amber-500",
      text: "text-amber-600",
      light: "bg-amber-50",
      border: "border-amber-200",
    },
    E: {
      ring: "#f97316",
      bg: "bg-orange-500",
      text: "text-orange-600",
      light: "bg-orange-50",
      border: "border-orange-200",
    },
    F: {
      ring: "#ef4444",
      bg: "bg-red-500",
      text: "text-red-600",
      light: "bg-red-50",
      border: "border-red-200",
    },
  }[letterGrade] || {
    ring: "#ef4444",
    bg: "bg-red-500",
    text: "text-red-600",
    light: "bg-red-50",
    border: "border-red-200",
  };

  // SVG donut ring — shows exam score as a fraction of 60 (max exam points)
  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(examScore / 60, 1); // exam portion is out of 60
  const dashArr = `${(pct * circ).toFixed(1)} ${circ.toFixed(1)}`;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-navy/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm mx-4 rounded-3xl shadow-2xl overflow-hidden">
        {/* ── Top banner ── */}
        <div className="bg-navy px-6 pt-7 pb-6 flex flex-col items-center">
          <p className="text-gold text-xs font-bold tracking-widest uppercase montserrat mb-3">
            BAAU İmtahan Sistemi
          </p>

          {/* Donut score ring */}
          <div className="relative w-28 h-28 mb-3">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Track */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.10)"
                strokeWidth="10"
              />
              {/* Progress */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={gradeColor.ring}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={dashArr}
                style={{ transition: "stroke-dasharray 1s ease" }}
              />
            </svg>
            {/* Centre letter grade */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black montserrat-900 text-white leading-none">
                {letterGrade}
              </span>
              <span className="text-xs text-slate-300 inter mt-0.5">
                qiymət
              </span>
            </div>
          </div>

          <h2 className="text-white text-xl font-bold montserrat-700 text-center">
            İmtahan Bitdi
          </h2>
        </div>

        {/* ── Score breakdown ── */}
        <div className="px-6 py-5 space-y-3">
          {/* 3 score tiles */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-navy/10 bg-navy/5 px-2 py-3">
              <p className="text-2xl font-black montserrat-900 text-navy">
                {preExam || 0}
              </p>
              <p className="text-slate-400 text-[11px] inter mt-0.5">
                Giriş balı
              </p>
            </div>
            <div
              className={`rounded-xl border ${isExamPassing ? "border-emerald-100 bg-emerald-50" : "border-red-100 bg-red-50"} px-2 py-3`}
            >
              <p
                className={`text-2xl font-black montserrat-900 ${isExamPassing ? "text-emerald-600" : "text-red-600"}`}
              >
                {examScore}
              </p>
              <p className="text-slate-400 text-[11px] inter mt-0.5">
                İmtahan balı
              </p>
            </div>
            <div
              className={`rounded-xl border ${isPassing ? "border-emerald-100 bg-emerald-50" : "border-red-100 bg-red-50"} px-2 py-3`}
            >
              <p
                className={`text-2xl font-black montserrat-900 ${isPassing ? "text-emerald-600" : "text-red-600"}`}
              >
                {finalScore}
              </p>
              <p className="text-slate-400 text-[11px] inter mt-0.5">
                Yekun bal
              </p>
            </div>
          </div>

          {/* Grade badge */}
          <div
            className={`flex items-center gap-2 rounded-xl border ${gradeColor.border} ${gradeColor.light} px-4 py-3`}
          >
            <div
              className={`w-8 h-8 rounded-lg ${gradeColor.bg} flex items-center justify-center flex-shrink-0`}
            >
              <span className="text-white text-sm font-black montserrat-900">
                {letterGrade}
              </span>
            </div>
            <p className={`text-sm font-semibold inter ${gradeColor.text}`}>
              {getMessage()}
            </p>
          </div>

          {/* Pass / Fail pill */}
          <div
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl ${
              isPassing ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
            }`}
          >
            {isPassing ? (
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
                <span className="text-sm font-bold montserrat-700 tracking-wide">
                  KEÇDİNİZ
                </span>
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
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-bold montserrat-700 tracking-wide">
                  KƏSİLDİNİZ
                </span>
              </>
            )}
          </div>
        </div>

        {/* ── Footer button ── */}
        <div className="px-6 pb-6">
          <button
            onClick={handleClose}
            className="w-full bg-navy hover:bg-navy-light text-white py-3 rounded-xl font-bold montserrat-700 text-sm tracking-wide transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-lg"
            style={{ boxShadow: "0 4px 14px rgba(15,42,74,0.25)" }}
          >
            Cavabları Yoxla
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
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Popup;
