import { useNavigate } from "react-router-dom";
import { useExam } from "../context/ExamContext";
import { logo } from "../assets";
import API_BASE from "../config/api";
import { useState } from "react";

// ── Reusable nav button with gold animated underline ──────────────────────────
const NavLink = ({ label, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`baau-navlink group ${
      disabled ? "baau-navlink-disabled" : "baau-navlink-active"
    }`}
  >
    {label}
  </button>
);

// ── Role badge shown next to the logo ─────────────────────────────────────────
const RoleBadge = ({ status }) => {
  const map = {
    student: { label: "TƏLƏBƏ",  bg: "bg-blue-500/20",  border: "border-blue-400/40",  text: "text-blue-200"  },
    teacher: { label: "MÜƏLLİM", bg: "bg-emerald-500/20", border: "border-emerald-400/40", text: "text-emerald-200" },
    staff:   { label: "ADMİN",   bg: "bg-red-500/20",   border: "border-red-400/40",   text: "text-red-200"   },
  };
  const s = map[status] || map.student;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-widest border ${s.bg} ${s.border} ${s.text} montserrat`}>
      {s.label}
    </span>
  );
};

// ── Main Navbar ───────────────────────────────────────────────────────────────
const Navbar = () => {
  const navigate = useNavigate();
  const { isExamActive } = useExam();
  const status = localStorage.getItem("status");
  const [studentInfo] = useState({
    fullname:     localStorage.getItem("fullname")     || "",
    studentId:    localStorage.getItem("studentId")    || "",
    group:        localStorage.getItem("group")        || "",
    faculty:      localStorage.getItem("faculty")      || "",
    ixtisaslasma: localStorage.getItem("ixtisaslasma") || "",
  });

  const handleNavigation = (path) => {
    if (!isExamActive) {
      navigate(path);
    }
  };

  return (
    <nav className="baau-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* ── LEFT: BAAU logo (always visible) + student/role info ── */}
          <div className="flex items-center gap-4">

            {/* University logo — always shown for every role */}
            <button
              onClick={() => handleNavigation("/")}
              disabled={isExamActive}
              className={`flex-shrink-0 transition-opacity duration-200 ${
                isExamActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-90"
              }`}
              title="Ana Səhifə"
            >
              <img
                src={logo}
                alt="BAAU Logo"
                className="h-12 w-auto object-contain"
              />
            </button>

            {/* Vertical gold rule */}
            <div className="hidden sm:block w-px h-10 bg-gradient-to-b from-transparent via-[#d4a017] to-transparent opacity-60" />

            {/* University name text — hidden on very small screens */}
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-white text-sm font-bold tracking-wider montserrat">
                BAAU
              </span>
              <span className="text-[#d4a017] text-[10px] font-semibold tracking-[0.15em] montserrat uppercase">
                İmtahan Sistemi
              </span>
            </div>

            {/* For students: show their photo + info inline */}
            {status === "student" && studentInfo.studentId && (
              <>
                <div className="hidden md:block w-px h-10 bg-gradient-to-b from-transparent via-slate-500 to-transparent opacity-40" />
                <div className="baau-student-card">
                  <img
                    src={`${API_BASE}/uploads/students/${studentInfo.studentId}.jpg`}
                    alt="Student"
                    className="baau-student-photo"
                  />
                  <div className="hidden md:flex flex-col gap-0.5">
                    <span className="text-white text-sm font-semibold leading-tight montserrat-600 truncate max-w-[200px]">
                      {studentInfo.fullname}
                    </span>
                    <span className="text-slate-300 text-xs inter">
                      {studentInfo.studentId}
                    </span>
                    {studentInfo.ixtisaslasma && (
                      <span className="text-slate-400 text-[11px] inter truncate max-w-[200px]">
                        {studentInfo.ixtisaslasma}
                      </span>
                    )}
                    {studentInfo.group && (
                      <span className="text-slate-400 text-[11px] inter">
                        Qrup: {studentInfo.group}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Role badge for staff/teacher */}
            {(status === "staff" || status === "teacher") && (
              <div className="hidden sm:block">
                <RoleBadge status={status} />
              </div>
            )}
          </div>

          {/* ── RIGHT: Navigation links ── */}
          <div className="flex items-center gap-1 sm:gap-2">

            {/* Exam active warning chip */}
            {isExamActive && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-300 bg-amber-400/10 border border-amber-400/30 px-3 py-1 rounded-full mr-2 montserrat">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                İmtahan davam edir
              </span>
            )}

            <NavLink
              label="Ana Səhifə"
              onClick={() => handleNavigation("/")}
              disabled={isExamActive}
            />

            {status === "student" && (
              <NavLink
                label="Nəticələr"
                onClick={() => handleNavigation("/results")}
                disabled={isExamActive}
              />
            )}

            {/* {status === "staff" && (
              <NavLink
                label="Sual Əlavə Et"
                onClick={() => handleNavigation("/admin/add-question")}
                disabled={isExamActive}
              />
            )} */}

            {status === "staff" && (
              <>
                <NavLink
                  label="Sualları Yüklə"
                  onClick={() => handleNavigation("/admin/export-questions")}
                  disabled={isExamActive}
                />
                <NavLink
                  label="Protokol"
                  onClick={() => handleNavigation("/admin/protocol")}
                  disabled={isExamActive}
                />
                <NavLink
                  label="Nəticələri Yüklə"
                  onClick={() => handleNavigation("/admin/results-by-date")}
                  disabled={isExamActive}
                />
              </>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;
