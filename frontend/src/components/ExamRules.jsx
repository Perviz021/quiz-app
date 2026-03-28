import React from "react";

const ExamRules = ({ acceptedRules, setAcceptedRules, onStartExam }) => {
  const rules = [
    "Tələbə bileti olmadan imtahana girmək qadağandır.",
    "Auditoriyanın sakitliyini pozmaq, yüksək səslə danışmaq qadağandır.",
    "Kənar kompüter və masalara baxmaq qadağandır.",
    "Nəzarətçinin təlimatlarına uymamaq qadağandır.",
    "İmtahan zamanı qulaqlıq, telefon və digər texniki avadanlıqlardan istifadə etmək qadağandır.",
    "Konspekt, dəftər və digər köməkçi vasitələrdən istifadə etmək qadağandır.",
    "Stol, stul və divarlara yazı yazmaq qadağandır.",
    "Digər tələbə yoldaşına kömək etmək qadağandır.",
    "Kompüterdə başqa səhifə açmaq qadağandır.",
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header card */}
        <div className="bg-navy rounded-t-2xl px-8 py-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold/20 border border-gold/30 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-6 h-6 text-gold"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div>
            <p className="text-gold text-xs font-bold tracking-widest uppercase montserrat mb-0.5">
              BAAU İmtahan Sistemi
            </p>
            <h2 className="text-white text-2xl font-bold montserrat-700">
              İmtahan Qaydaları
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="bg-white shadow-xl rounded-b-2xl">
          {/* Info strip */}
          <div className="px-8 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-amber-500 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-amber-700 text-xs font-semibold inter">
              Zəhmət olmasa qaydaları diqqətlə oxuyun. İmtahan başladıqdan sonra
              geri qayıtmaq olmaz.
            </p>
          </div>

          <div className="px-8 py-6">
            {/* Rules list */}
            <div className="space-y-3 mb-6">
              {rules.map((rule, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-navy-mid text-white text-xs font-bold montserrat-700 flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-slate-700 text-sm inter leading-relaxed">
                    {rule}
                  </p>
                </div>
              ))}
            </div>

            {/* Gold divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-40 mb-6" />

            {/* Checkbox */}
            <label
              htmlFor="acceptRules"
              className="flex items-center gap-3 cursor-pointer group mb-6 select-none"
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                  acceptedRules
                    ? "bg-navy border-navy"
                    : "border-slate-300 group-hover:border-navy-mid"
                }`}
              >
                {acceptedRules && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <input
                id="acceptRules"
                type="checkbox"
                checked={acceptedRules}
                onChange={(e) => setAcceptedRules(e.target.checked)}
                className="sr-only"
              />
              <span className="text-sm text-slate-700 inter font-medium group-hover:text-slate-900 transition-colors">
                Qaydaları oxudum və{" "}
                <span className="text-navy font-semibold">razıyam</span>
              </span>
            </label>

            {/* Start button */}
            <button
              onClick={onStartExam}
              disabled={!acceptedRules}
              className={`w-full py-3.5 px-6 rounded-xl text-base font-bold montserrat-700 tracking-wide transition-all duration-200 flex items-center justify-center gap-2 ${
                acceptedRules
                  ? "bg-navy hover:bg-navy-light text-white cursor-pointer shadow-lg shadow-navy/20 hover:shadow-navy/30 hover:-translate-y-0.5"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {acceptedRules ? (
                <>
                  İmtahana Başla
                  <svg
                    className="w-5 h-5"
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
                </>
              ) : (
                "Qaydaları qəbul edin"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamRules;
