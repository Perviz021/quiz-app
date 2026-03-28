import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { formatDate } from "../utils/dateFormatter";
import API_BASE from "../config/api";
import { toast } from "react-toastify";

// ── Subject card sub-components ───────────────────────────────────────────────

const CardTeacher = ({ subject }) => (
  <div className="h-full p-5 flex flex-col">
    <div className="flex items-start justify-between mb-3">
      <span className="text-[11px] font-bold uppercase tracking-widest text-[#d4a017] bg-[#d4a017]/10 px-2 py-0.5 rounded montserrat">
        {subject.id}
      </span>
      <span className="text-[11px] text-blue-200 bg-white/10 px-2 py-0.5 rounded inter">
        {subject.lang === "az" ? "AZ" : "EN"}
      </span>
    </div>
    <h3 className="text-white font-semibold text-sm leading-snug flex-1 mb-4 montserrat-600">
      {subject.name}
    </h3>
    <div className="baau-gold-divider mb-3" />
    <div className="flex items-center justify-between">
      <span className="text-blue-200 text-[11px] inter">Sualları idarə et</span>
      <div className="w-6 h-6 rounded-full bg-[#d4a017]/20 flex items-center justify-center">
        <svg
          className="w-3 h-3 text-[#d4a017]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  </div>
);

const InfoRow = ({ label, value }) =>
  value ? (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-[11px] text-slate-400 inter shrink-0">{label}</span>
      <span className="text-[11px] text-slate-600 inter text-right truncate">
        {value}
      </span>
    </div>
  ) : null;

const CardCompleted = ({ subject }) => (
  <div className="h-full p-5 flex flex-col">
    <div className="flex items-start justify-between mb-2">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded montserrat">
        {subject.id}
      </span>
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 inter">
        <svg
          className="w-3 h-3 text-green-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        Tamamlandı
      </span>
    </div>
    <h3 className="text-slate-600 font-semibold text-sm leading-snug mb-3 montserrat-600">
      {subject.name}
    </h3>
    <div className="space-y-1 mt-auto">
      <InfoRow label="Tarix" value={formatDate(subject.exam_date)} />
      <InfoRow label="Qrup" value={subject.fenn_qrupu} />
      <InfoRow
        label="Dil"
        value={subject.lang === "az" ? "Azərbaycan" : "English"}
      />
      <InfoRow label="Giriş balı" value={subject.pre_exam} />
      <InfoRow label="Q/b" value={subject.qaib} />
      <InfoRow label="Müəllim" value={subject.professor} />
    </div>
    <p className="text-[11px] text-red-400 mt-3 font-semibold montserrat-600">
      İmtahan bitmişdir
    </p>
  </div>
);

const CardIneligible = ({ subject, reason }) => (
  <div className="h-full p-5 flex flex-col">
    <div className="flex items-start justify-between mb-2">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded montserrat">
        {subject.id}
      </span>
      <svg
        className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
        />
      </svg>
    </div>
    <h3 className="text-slate-500 font-semibold text-sm leading-snug mb-3 montserrat-600">
      {subject.name}
    </h3>
    <div className="space-y-1 mt-auto">
      <InfoRow label="Tarix" value={formatDate(subject.exam_date)} />
      <InfoRow label="Qrup" value={subject.fenn_qrupu} />
      <InfoRow
        label="Dil"
        value={subject.lang === "az" ? "Azərbaycan" : "English"}
      />
      <InfoRow label="Giriş balı" value={subject.pre_exam} />
      <InfoRow label="Q/b" value={subject.qaib} />
      <InfoRow label="Müəllim" value={subject.professor} />
    </div>
    <p className="text-[11px] text-red-500 mt-3 font-semibold montserrat-600">
      {reason}
    </p>
  </div>
);

const CardActive = ({ subject, requestStatus, onStart, onRequest }) => (
  <div className="h-full p-5 flex flex-col">
    <div className="flex items-start justify-between mb-2">
      <span className="text-[11px] font-bold uppercase tracking-widest text-[#d4a017] bg-[#d4a017]/10 px-2 py-0.5 rounded montserrat">
        {subject.id}
      </span>
      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 bg-emerald-400/10 border border-emerald-400/25 px-2 py-0.5 rounded inter">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Bu gün
      </span>
    </div>
    <h3 className="text-white font-semibold text-sm leading-snug mb-3 montserrat-600">
      {subject.name}
    </h3>
    <div className="baau-gold-divider mb-3" />
    <div className="space-y-1 mb-4">
      <InfoRow
        label="Tarix"
        value={
          <span className="text-blue-200">{formatDate(subject.exam_date)}</span>
        }
      />
      <InfoRow
        label="Qrup"
        value={<span className="text-blue-200">{subject.fenn_qrupu}</span>}
      />
      <InfoRow
        label="Dil"
        value={
          <span className="text-blue-200">
            {subject.lang === "az" ? "Azərbaycan" : "English"}
          </span>
        }
      />
      <InfoRow
        label="Giriş"
        value={<span className="text-blue-200">{subject.pre_exam}</span>}
      />
      <InfoRow
        label="Müəllim"
        value={
          <span className="text-blue-200 truncate">{subject.professor}</span>
        }
      />
    </div>
    {requestStatus === "approved" ? (
      <button
        onClick={onStart}
        className="w-full mt-auto bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white text-xs font-bold py-2.5 rounded-lg transition-colors duration-200 cursor-pointer montserrat-700 tracking-wide"
      >
        İmtahana Başla →
      </button>
    ) : requestStatus === "pending" ? (
      <div className="w-full mt-auto flex items-center justify-center gap-2 bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold py-2.5 rounded-lg montserrat-600">
        <svg
          className="w-3.5 h-3.5 animate-spin"
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
        Sorğu gözlənilir...
      </div>
    ) : (
      <button
        onClick={onRequest}
        className="w-full mt-auto bg-[#d4a017] hover:bg-[#f0c040] active:bg-[#b8860b] text-[#0f2a4a] text-xs font-bold py-2.5 rounded-lg transition-colors duration-200 cursor-pointer montserrat-700 tracking-wide"
      >
        Sorğu Göndər
      </button>
    )}
  </div>
);

const CardNotToday = ({ subject }) => (
  <div className="h-full p-5 flex flex-col">
    <div className="flex items-start justify-between mb-2">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded montserrat">
        {subject.id}
      </span>
      <svg
        className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
    <h3 className="text-slate-500 font-semibold text-sm leading-snug mb-3 montserrat-600">
      {subject.name}
    </h3>
    <div className="space-y-1 mt-auto">
      <InfoRow label="Tarix" value={formatDate(subject.exam_date)} />
      <InfoRow label="Qrup" value={subject.fenn_qrupu} />
      <InfoRow
        label="Dil"
        value={subject.lang === "az" ? "Azərbaycan" : "English"}
      />
      <InfoRow label="Giriş balı" value={subject.pre_exam} />
      <InfoRow label="Q/b" value={subject.qaib} />
      <InfoRow label="Müəllim" value={subject.professor} />
    </div>
    <p className="text-[11px] text-slate-400 mt-3 inter">Bugün mövcud deyil</p>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const Home = () => {
  const [subjects, setSubjects] = useState([]);
  const [completedExams, setCompletedExams] = useState(new Set());
  const [fullname, setFullname] = useState();
  const [examRequests, setExamRequests] = useState({});
  const navigate = useNavigate();
  const status = localStorage.getItem("status");

  useEffect(() => {
    console.log(subjects);
  }, [subjects, setSubjects]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setFullname(localStorage.getItem("fullname"));

    if (!token) {
      navigate("/login");
      return;
    }

    const storedSubjects = JSON.parse(localStorage.getItem("subjects")) || [];
    const formattedSubjects = storedSubjects.map((subject) => ({
      id: subject["Fənnin kodu"],
      name: subject["Fənnin adı"],
      exam_date: subject["Exam_date"],
      fenn_qrupu: subject["Stable"],
      lang: subject["lang"] || "az",
      pre_exam: subject["Pre-Exam"],
      professor: subject["Professor"],
      fsk: subject["FSK"],
      fk: subject["FK"],
      qaib: subject["Qaib"],
      ep: subject["EP"],
    }));

    setSubjects(formattedSubjects);

    if (status === "student") {
      fetch(`${API_BASE}/completed-exams`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setCompletedExams(new Set(data.completedExams)))
        .catch((err) => console.error("Error fetching completed exams:", err));

      fetch(`${API_BASE}/exam-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          const requestsMap = {};
          data.requests.forEach((request) => {
            requestsMap[request.subjectId] = request.status;
          });
          setExamRequests(requestsMap);
        })
        .catch((err) => console.error("Error fetching exam requests:", err));
    }
  }, [navigate, status]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
    window.location.reload();
  };

  const handleRequestExam = async (subjectId, event) => {
    event.stopPropagation();
    try {
      const response = await fetch(`${API_BASE}/request-exam`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ subjectId }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setExamRequests((prev) => ({ ...prev, [subjectId]: "pending" }));
      toast.success(
        "İmtahan üçün sorğu göndərildi. Admin təsdiqlədikdən sonra imtahana başlaya bilərsiniz.",
      );
    } catch (error) {
      console.error("Error requesting exam:", error);
      toast.error("İmtahan sorğusu göndərilmədi. Xəta baş verdi.");
    }
  };

  const handleSubjectClick = (subject) => {
    console.log("Clicked subject:", subject);
    if (status === "teacher") {
      navigate(`/edit-questions/${subject.id}/${subject.lang}`);
    } else {
      const examDate = parseExamDate(subject.exam_date);
      const today = getNormalizedCurrentDate();
      if (examDate && examDate.getTime() === today.getTime()) {
        if (!completedExams.has(subject.id)) {
          if (subject.ep === 31) {
            alert(
              "Qayıb limitini keçdiyinizə görə imtahanda iştirak edə bilməzsiniz.",
            );
            return;
          } else if (subject.ep === 32) {
            alert("İmtahana qatıla bilməzsiniz. Təhsil haqqı ödənilməyib.");
            return;
          } else if (subject.ep !== 10) {
            alert(
              "İmtahana qatıla bilməzsiniz. İmtahan parametri uyğun deyil.",
            );
            return;
          }
          if (examRequests[subject.id] !== "approved") {
            toast.error(
              "İmtahana başlamaq üçün admin təsdiqi lazımdır. Zəhmət olmasa sorğu göndərin.",
            );
            return;
          }
          console.log(
            "Navigating to exam:",
            `/exam/${subject.id}/${subject.lang}`,
          );
          navigate(`/exam/${subject.id}/${subject.lang}`);
        }
      }
    }
  };

  const formattedString = (str) => {
    if (!str) return "";
    return str.slice(0, str.lastIndexOf(" ") + 1).trim();
  };

  const getNormalizedCurrentDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0, 0);
    return today;
  };

  const parseExamDate = (examDate) => {
    try {
      if (!examDate) {
        console.log("No exam date provided");
        return null;
      }
      const [datePart] = examDate.split(" ");
      const [year, month, day] = datePart.split("-").map(Number);
      if (!day || !month || !year) {
        console.log("Invalid date parts");
        return null;
      }
      const date = new Date(year, month - 1, day);
      date.setHours(0, 0, 0, 0);
      if (isNaN(date.getTime())) {
        console.log("Invalid date after parsing");
        return null;
      }
      return date;
    } catch (error) {
      console.error("Error parsing exam_date:", error);
      return null;
    }
  };

  const isExamDateToday = (examDate) => {
    const examDateTime = parseExamDate(examDate);
    if (!examDateTime) return false;
    return examDateTime.getTime() === getNormalizedCurrentDate().getTime();
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* ── Page header banner ── */}
      <div className="bg-navy-mid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-gold-light text-[11px] font-semibold tracking-widest uppercase montserrat mb-1">
              {status === "teacher" ? "Müəllim Paneli" : "Tələbə Paneli"}
            </p>
            <h1 className="text-white text-2xl font-bold montserrat-700 leading-tight">
              Xoş Gəlmisiniz,{" "}
              <span className="text-gold-light">
                {formattedString(fullname)}
              </span>
            </h1>
            <p className="text-slate-300 text-sm inter mt-1">
              {status === "teacher"
                ? "Fənn suallarını idarə edin"
                : `${subjects.length} fənn tapıldı`}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="self-start sm:self-auto flex items-center gap-2 bg-red-600/70 hover:bg-red-600 border border-red-500/50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors duration-200 cursor-pointer montserrat-600"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Çıxış
          </button>
        </div>

        {/* Wave divider */}
        <svg
          viewBox="0 0 1440 24"
          className="w-full block"
          preserveAspectRatio="none"
          style={{ height: "24px" }}
        >
          <path
            d="M0,24 C360,0 1080,0 1440,24 L1440,24 L0,24 Z"
            fill="var(--color-surface, #f4f6fa)"
          />
        </svg>
      </div>

      {/* ── Subject grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {subjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {subjects.map((subject) => {
              const isToday = isExamDateToday(subject.exam_date);
              const isCompleted = completedExams.has(subject.id);
              const isEligible = subject.ep === 10;
              const requestStatus = examRequests[subject.id];

              let wrapperClass = "";
              let clickable = false;

              if (status === "teacher") {
                wrapperClass =
                  "bg-navy-mid hover:bg-navy-light border border-white/10";
                clickable = true;
              } else if (isCompleted) {
                wrapperClass =
                  "bg-white border border-border opacity-75";
              } else if (!isEligible) {
                wrapperClass =
                  "bg-white border border-border opacity-60";
              } else if (isToday) {
                wrapperClass =
                  "bg-navy-mid hover:bg-navy-light border border-white/10";
                clickable = true;
              } else {
                wrapperClass =
                  "bg-white border border-border opacity-75";
              }

              return (
                <div
                  key={subject.id}
                  onClick={() =>
                    status === "teacher"
                      ? handleSubjectClick(subject)
                      : isEligible && handleSubjectClick(subject)
                  }
                  className={`rounded-2xl shadow-sm overflow-hidden transition-all duration-200 min-h-[210px] ${wrapperClass} ${
                    clickable
                      ? "hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                      : "cursor-default"
                  }`}
                >
                  {status === "teacher" ? (
                    <CardTeacher subject={subject} />
                  ) : isCompleted ? (
                    <CardCompleted subject={subject} />
                  ) : !isEligible ? (
                    <CardIneligible
                      subject={subject}
                      reason={
                        subject.ep === 31
                          ? "Qayıb limiti keçilib"
                          : subject.ep === 32
                            ? "Təhsil haqqı ödənilməyib"
                            : "İmtahan parametri uyğun deyil"
                      }
                    />
                  ) : isToday ? (
                    <CardActive
                      subject={subject}
                      requestStatus={requestStatus}
                      onStart={() => handleSubjectClick(subject)}
                      onRequest={(e) =>
                        handleRequestExam(
                          subject.id,
                          e || { stopPropagation: () => {} },
                        )
                      }
                    />
                  ) : (
                    <CardNotToday subject={subject} />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="w-16 h-16 rounded-full bg-navy-mid/10 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-navy-mid/30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <p className="text-slate-500 text-base montserrat-600">
              {status === "teacher"
                ? "Müəllimin fənləri mövcud deyil."
                : "Tələbənin fənləri mövcud deyil."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
