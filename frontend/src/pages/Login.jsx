import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import API_BASE from "../config/api";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { logo } from "../assets";

const Login = ({ setToken, setSubjects }) => {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Trim student code and password before processing
    const trimmedStudentId = studentId.trim();
    const trimmedPassword = password.trim();

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: trimmedStudentId,
          password: trimmedPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Something went wrong");

      localStorage.setItem("token", data.token);
      localStorage.setItem("studentId", data.student.studentId);
      localStorage.setItem("status", data.student.status);
      localStorage.setItem("fullname", data.student.fullname);
      localStorage.setItem("group", data.student.group);
      localStorage.setItem("faculty", data.student.faculty);
      localStorage.setItem("ixtisaslasma", data.student.ixtisaslasma);

      setToken(data.token);

      if (data.student.status === "student") {
        localStorage.setItem("subjects", JSON.stringify(data.subjects));
        setSubjects(data.subjects);
        navigate("/");
      } else if (data.student.status === "staff") {
        navigate("/admin");
      } else if (data.student.status === "teacher") {
        localStorage.setItem("subjects", JSON.stringify(data.subjects));
        setSubjects(data.subjects);
        navigate("/teacher");
      }
    } catch (err) {
      toast.error(err.message, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  const inputClass =
    "w-full px-4 py-3 border border-border rounded-xl text-sm inter bg-slate-50 focus:bg-white focus:ring-2 focus:ring-navy/25 focus:border-navy outline-none transition-all";

  return (
    <div className="min-h-screen flex flex-col loginBg overflow-hidden">
      {/* Same header language as Home / AdminDashboard */}
      <div className="bg-navy-mid shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={logo}
              alt=""
              className="h-12 sm:h-14 w-auto object-contain drop-shadow-md"
            />
            <div>
              <p className="text-gold-light text-[11px] font-semibold tracking-widest uppercase montserrat mb-0.5">
                ETIS
              </p>
              <h1 className="text-white text-xl sm:text-2xl font-bold montserrat-700 leading-tight">
                Sistemə <span className="text-gold-light">giriş</span>
              </h1>
              <p className="text-slate-300 text-sm inter mt-1">
                Tələbə və ya işçi kodunuz ilə daxil olun
              </p>
            </div>
          </div>
        </div>

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

      {/* Background photo still covers full viewport via .loginBg; card sits over lower area */}
      <div className="flex-1 flex items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-md rounded-2xl border border-white/25 bg-white/95 shadow-2xl backdrop-blur-sm p-8 sm:p-9">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800 montserrat-700 tracking-tight">
              Xoş gəlmisiniz
            </h2>
            <div className="baau-gold-divider mx-auto mt-4 mb-0" />
            <p className="text-slate-500 text-sm inter mt-4">
              Şəxsi məlumatlarınızı təhlükəsiz şəkildə daxil edin
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider montserrat mb-1.5">
                Tələbə kodu / İşçi kodu
              </label>
              <input
                type="text"
                placeholder="Kodu daxil edin"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                className={inputClass}
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider montserrat mb-1.5">
                Şifrə
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Şifrənizi daxil edin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`${inputClass} pr-12`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-navy transition-colors duration-200 cursor-pointer"
                  aria-label={
                    showPassword ? "Şifrəni gizlət" : "Şifrəni göstər"
                  }
                >
                  {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-navy hover:bg-navy-light text-white text-sm font-bold py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/40 focus:ring-offset-2 transition-colors duration-200 cursor-pointer montserrat-700 tracking-wide"
            >
              Giriş et
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
