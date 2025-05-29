import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import API_BASE from "../config/api";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Login = ({ setToken, setSubjects }) => {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, password }),
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 loginBg">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 transform transition-all duration-300 hover:scale-105">
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-8 tracking-tight">
          Xoş Gəlmisiniz
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Tələbə Kodu / İşçi Kodu
            </label>
            <input
              type="text"
              placeholder="Kodu daxil edin"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Şifrə
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Şifrənizi daxil edin"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-indigo-600 transition-colors duration-200 cursor-pointer"
              >
                {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 cursor-pointer"
          >
            Giriş Et
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
