import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../config/api";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import TimeExtensionModal from "../components/TimeExtensionModal";
import ForceSubmitModal from "../components/ForceSubmitModal";

const SOCKET_SERVER_URL = import.meta.env.VITE_API_BASE
  ? import.meta.env.VITE_API_BASE.replace(/\/api$/, "")
  : API_BASE;

const socket = io(SOCKET_SERVER_URL, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 30000,
  autoConnect: true,
});

// ── Shared section card ───────────────────────────────────────────────────────
const SectionCard = ({ title, icon, badge, children, collapsible = false }) => {
  const [collapsed, setCollapsed] = useState(collapsible);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden mb-6">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-slate-50/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center shrink-0">
            {icon}
          </div>
          <h3 className="text-sm font-bold text-gray-800 montserrat-700 tracking-tight">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {badge}
          {collapsible && (
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              title={collapsed ? "Genişləndir" : "Yığ"}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-navy hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <svg
                className="w-4 h-4 transition-transform duration-300"
                style={{
                  transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
                }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateRows: collapsed ? "0fr" : "1fr",
          transition: "grid-template-rows 0.3s ease",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
};

// ── Countdown timer cell ──────────────────────────────────────────────────────
const TimeDisplay = ({ seconds }) => {
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return (
    <span
      className={`font-mono font-bold text-sm ${seconds < 600 ? "text-red-500" : "text-gray-700"}`}
    >
      {h}:{m}:{s}
    </span>
  );
};

// ── Table head cell ───────────────────────────────────────────────────────────
const TH = ({ children, className = "" }) => (
  <th
    className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white montserrat ${className}`}
  >
    {children}
  </th>
);

// ── Empty state placeholder ───────────────────────────────────────────────────
const EmptyState = ({ icon, message }) => (
  <div className="flex flex-col items-center py-10 text-center">
    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
      {icon}
    </div>
    <p className="text-slate-500 text-sm inter">{message}</p>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const [activeStudents, setActiveStudents] = useState([]);
  const [examRequests, setExamRequests] = useState([]);
  const navigate = useNavigate();
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [isForceSubmitModalOpen, setIsForceSubmitModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [examParamForm, setExamParamForm] = useState({
    studentId: "",
    subjectGroup: "",
    newEP: "10",
  });

  useEffect(() => {
    fetch(`${API_BASE}/active-students`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setActiveStudents(d.students || []);
      })
      .catch((e) =>
        toast.error(`Tələbələri yükləmək mümkün olmadı: ${e.message}`),
      );

    fetch(`${API_BASE}/pending-exam-requests`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setExamRequests(d.requests || []);
      })
      .catch((e) =>
        toast.error(`İmtahan sorğularını yükləmək mümkün olmadı: ${e.message}`),
      );

    socket.on("connect", () =>
      console.log("🟢 Admin socket connected:", socket.id),
    );
    socket.on("update_active_students", (students) => {
      console.log("Active students update:", students);
      setActiveStudents(students || []);
    });
    socket.on("new_exam_request", (request) => {
      setExamRequests((prev) => [...prev, request]);
      toast.info("Yeni imtahan sorğusu gəldi!");
    });
    socket.on("student_disconnected", ({ studentId }) => {
      console.log(`Student ${studentId} disconnected`);
      setActiveStudents((prev) => prev.filter((s) => s.id !== studentId));
    });
    socket.on("error", (message) => {
      console.error("Socket error:", message);
      toast.error(`Bağlantı xətası: ${message}`);
    });

    return () => {
      socket.off("connect");
      socket.off("update_active_students");
      socket.off("new_exam_request");
      socket.off("student_disconnected");
      socket.off("error");
    };
  }, []);

  const handleForceSubmitClick = (student) => {
    setSelectedStudent(student);
    setIsForceSubmitModalOpen(true);
  };

  const handleForceSubmitConfirm = async () => {
    if (!selectedStudent) return;
    try {
      const res = await fetch(`${API_BASE}/force-submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          subjectCode: selectedStudent.subjectCode,
          forceSubmit: true,
          answers: [],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success("İmtahan bitirildi və tələbə 0 bal aldı.");
      setActiveStudents((prev) =>
        prev.filter((s) => s.id !== selectedStudent.id),
      );
      setIsForceSubmitModalOpen(false);
      setSelectedStudent(null);
    } catch (err) {
      console.error("Force submit error:", err);
      toast.error(`İmtahanı bitirmək mümkün olmadı: ${err.message}`);
    }
  };

  const handleExtendTime = (studentId) => {
    setSelectedStudent(studentId);
    setIsTimeModalOpen(true);
  };

  const handleTimeConfirm = (minutes) => {
    if (!selectedStudent) return;
    const student = activeStudents.find((s) => s.id === selectedStudent);
    if (!student) return;
    fetch(`${API_BASE}/extend-time`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        studentId: selectedStudent,
        subjectCode: student.subjectCode,
        minutes,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        socket.emit("extend_time", { roomId: selectedStudent, minutes });
        toast.success(`${minutes} dəqiqə əlavə edildi!`);
      })
      .catch((e) => {
        console.error("Extend time error:", e);
        toast.error(`Vaxt əlavə etmək mümkün olmadı: ${e.message}`);
      });
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
    window.location.reload();
  };

  const handleExamParamUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/update-exam-parameter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(examParamForm),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success("İmtahan parametri yeniləndi!");
      setExamParamForm({ studentId: "", subjectGroup: "", newEP: "10" });
    } catch (err) {
      console.error("Update exam parameter error:", err);
      toast.error(
        `İmtahan parametrini yeniləmək mümkün olmadı: ${err.message}`,
      );
    }
  };

  const handleExamRequest = async (requestId, action) => {
    try {
      const res = await fetch(`${API_BASE}/handle-exam-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ requestId, action }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setExamRequests((prev) => prev.filter((r) => r.id !== requestId));
      socket.emit("exam_request_response", {
        studentId: data.studentId,
        subjectId: data.subjectId,
        status: action === "approve" ? "approved" : "rejected",
      });
      toast.success(
        action === "approve"
          ? "İmtahan sorğusu təsdiqləndi!"
          : "İmtahan sorğusu rədd edildi!",
      );
    } catch (err) {
      console.error("Handle exam request error:", err);
      toast.error(
        `İmtahan sorğusunu ${action === "approve" ? "təsdiqləmək" : "rədd etmək"} mümkün olmadı: ${err.message}`,
      );
    }
  };

  const handleApproveAll = async () => {
    try {
      const res = await fetch(`${API_BASE}/approve-all-exam-requests`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setExamRequests([]);
      toast.success(data.message || "Bütün sorğular təsdiqləndi!");
    } catch (err) {
      console.error("Error approving all requests:", err);
      toast.error("Bütün sorğuları təsdiqləmək mümkün olmadı.");
    }
  };

  const formattedString = (str) => {
    if (!str) return "";
    return str.slice(0, str.lastIndexOf(" ") + 1).trim();
  };

  const inputClass =
    "w-full px-3 py-2.5 border border-border rounded-lg text-sm inter focus:ring-2 focus:ring-navy/25 focus:border-navy outline-none transition-all bg-slate-50 focus:bg-white";

  return (
    <div className="min-h-screen bg-surface">
      {/* ── Page header banner ── */}
      <div className="bg-navy-mid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
            <div>
              <p className="text-gold-light text-[11px] font-semibold tracking-widest uppercase montserrat mb-1">
                Admin Paneli
              </p>
              <h1 className="text-white text-2xl font-bold montserrat-700">
                Xoş Gəlmisiniz,{" "}
                <span className="text-gold-light">
                  {formattedString(localStorage.getItem("fullname"))}
                </span>
              </h1>
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

          {/* Stats tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              {
                value: activeStudents.length,
                label: "Aktiv tələbə",
                color: "bg-emerald-400/20",
                icon: (
                  <svg
                    className="w-5 h-5 text-emerald-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                ),
              },
              {
                value: examRequests.length,
                label: "Gözləyən sorğu",
                color: "bg-gold/20",
                icon: (
                  <svg
                    className="w-5 h-5 text-gold-light"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                ),
              },
              {
                value: (
                  <span className="text-emerald-300 text-sm font-semibold inter">
                    Aktiv
                  </span>
                ),
                label: "Sistem statusu",
                color: "bg-blue-400/20",
                icon: (
                  <svg
                    className="w-5 h-5 text-blue-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ),
              },
            ].map(({ value, label, color, icon }, i) => (
              <div
                key={i}
                className="bg-white/10 border border-white/15 rounded-xl px-4 py-3 flex items-center gap-3"
              >
                <div
                  className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center shrink-0`}
                >
                  {icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-white montserrat-700 leading-none">
                    {value}
                  </p>
                  <p className="text-blue-200 text-[11px] inter mt-0.5">
                    {label}
                  </p>
                </div>
              </div>
            ))}
          </div>
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

      {/* ── Main sections ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Exam Requests ── */}
        <SectionCard
          title="İmtahan Sorğuları"
          icon={
            <svg
              className="w-4 h-4 text-gold-light"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          }
          badge={
            examRequests.length > 0 && (
              <span className="text-xs font-bold bg-gold text-navy px-2.5 py-0.5 rounded-full montserrat-700">
                {examRequests.length}
              </span>
            )
          }
        >
          {examRequests.length === 0 ? (
            <EmptyState
              message="Hal-hazırda gözləyən imtahan sorğusu yoxdur."
              icon={
                <svg
                  className="w-6 h-6 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
          ) : (
            <>
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleApproveAll}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer montserrat-700"
                >
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Təsdiqlə Hamısını
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-navy">
                      <TH>Tələbə</TH>
                      <TH>Fənn</TH>
                      <TH className="hidden sm:table-cell">Sorğu Vaxtı</TH>
                      <TH>Əməliyyat</TH>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {examRequests.map((req, idx) => (
                      <tr
                        key={req.id}
                        className={`transition-colors hover:bg-blue-50/40 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                      >
                        <td className="px-4 py-3 font-semibold text-gray-800 inter">
                          {req.studentName}
                        </td>
                        <td className="px-4 py-3 text-gray-600 inter">
                          {req.subjectName}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs inter hidden sm:table-cell">
                          {new Date(req.requestTime).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                handleExamRequest(req.id, "approve")
                              }
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer montserrat-600"
                            >
                              Təsdiqlə
                            </button>
                            <button
                              onClick={() =>
                                handleExamRequest(req.id, "reject")
                              }
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer montserrat-600"
                            >
                              Rədd Et
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </SectionCard>

        {/* ── Exam Parameter Management ── */}
        <SectionCard
          collapsible
          title="İmtahan Parametrini Yenilə"
          icon={
            <svg
              className="w-4 h-4 text-blue-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          }
        >
          <form onSubmit={handleExamParamUpdate}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider montserrat mb-1.5">
                  Tələbə Kodu
                </label>
                <input
                  type="text"
                  value={examParamForm.studentId}
                  onChange={(e) =>
                    setExamParamForm((p) => ({
                      ...p,
                      studentId: e.target.value,
                    }))
                  }
                  className={inputClass}
                  required
                  placeholder="XXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider montserrat mb-1.5">
                  Fənn Qrupu
                </label>
                <input
                  type="text"
                  value={examParamForm.subjectGroup}
                  onChange={(e) =>
                    setExamParamForm((p) => ({
                      ...p,
                      subjectGroup: e.target.value,
                    }))
                  }
                  className={inputClass}
                  required
                  placeholder="Qrup kodu"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider montserrat mb-1.5">
                  İmtahan Parametri
                </label>
                <input
                  type="number"
                  value={examParamForm.newEP}
                  onChange={(e) =>
                    setExamParamForm((p) => ({ ...p, newEP: e.target.value }))
                  }
                  className={inputClass}
                  required
                  min="0"
                  placeholder="10 / 31 / 32"
                />
                <p className="text-[11px] text-slate-400 mt-1.5 inter">
                  10 = icazə · 31 = qayıb · 32 = təhsil haqqı
                </p>
              </div>
            </div>
            <button
              type="submit"
              className="flex items-center gap-2 bg-navy hover:bg-navy-light text-white text-xs font-bold px-5 py-2.5 rounded-lg transition-colors cursor-pointer montserrat-700"
            >
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Yenilə
            </button>
          </form>
        </SectionCard>

        {/* ── Active Students ── */}
        <SectionCard
          title="Aktiv İmtahanda Olan Tələbələr"
          icon={
            <svg
              className="w-4 h-4 text-emerald-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          }
          badge={
            activeStudents.length > 0 && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold bg-emerald-500 text-white px-2.5 py-0.5 rounded-full montserrat-700">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {activeStudents.length} aktiv
              </span>
            )
          }
        >
          {activeStudents?.length === 0 ? (
            <EmptyState
              message="Hal-hazırda aktiv tələbə yoxdur."
              icon={
                <svg
                  className="w-6 h-6 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-navy">
                    <TH>Ad Soyad</TH>
                    <TH className="hidden sm:table-cell">Fənn</TH>
                    <TH>Vaxt Qalıb</TH>
                    <TH className="hidden md:table-cell">Bonus</TH>
                    <TH>Əməliyyat</TH>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activeStudents?.map((student, idx) => (
                    <tr
                      key={student.id}
                      className={`transition-colors hover:bg-blue-50/40 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-navy montserrat-700">
                              {student.fullname?.charAt(0) || "?"}
                            </span>
                          </div>
                          <span className="font-semibold text-gray-800 inter">
                            {student.fullname}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 inter hidden sm:table-cell">
                        {student.subject}
                      </td>
                      <td className="px-4 py-3">
                        <TimeDisplay seconds={student.timeLeft} />
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="bg-blue-50 text-blue-700 text-[11px] font-semibold px-2 py-0.5 rounded-full inter">
                          +{student.bonusTime || 0} dəq
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleForceSubmitClick(student)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer montserrat-600 whitespace-nowrap"
                          >
                            Bitir
                          </button>
                          <button
                            onClick={() => handleExtendTime(student.id)}
                            className="bg-navy hover:bg-navy-light text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer montserrat-600 whitespace-nowrap"
                          >
                            Vaxt +
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      <TimeExtensionModal
        isOpen={isTimeModalOpen}
        onClose={() => setIsTimeModalOpen(false)}
        onConfirm={handleTimeConfirm}
      />
      <ForceSubmitModal
        isOpen={isForceSubmitModalOpen}
        onClose={() => {
          setIsForceSubmitModalOpen(false);
          setSelectedStudent(null);
        }}
        onConfirm={handleForceSubmitConfirm}
        studentName={selectedStudent?.fullname}
      />
    </div>
  );
};

export default AdminDashboard;
