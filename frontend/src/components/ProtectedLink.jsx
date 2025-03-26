import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const ProtectedLink = ({ to, children, className }) => {
  const navigate = useNavigate();
  const [isExamActive, setIsExamActive] = useState(false);

  useEffect(() => {
    // Check exam status from localStorage (or use context if you prefer)
    const examStatus = localStorage.getItem("examActive") === "true";
    setIsExamActive(examStatus);

    // Listen for changes (in case other tabs modify it)
    const handleStorageChange = () => {
      setIsExamActive(localStorage.getItem("examActive") === "true");
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleClick = (e) => {
    if (isExamActive) {
      e.preventDefault();
      const confirmLeave = window.confirm(
        "Siz imtahanı tərk edirsiniz! Əgər çıxarsanız, 0 bal alacaqsınız!"
      );

      if (confirmLeave) {
        // Trigger force submit logic
        localStorage.setItem("forceSubmit", "true");
        localStorage.setItem("examActive", "false");
        navigate(to);
      }
    } else {
      navigate(to);
    }
  };

  return (
    <a
      onClick={handleClick}
      className={`cursor-pointer hover:underline ${className || ""}`}
    >
      {children}
    </a>
  );
};

export default ProtectedLink;
