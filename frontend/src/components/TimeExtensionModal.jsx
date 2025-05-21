import { useState } from "react";

const TimeExtensionModal = ({ isOpen, onClose, onConfirm }) => {
  const [minutes, setMinutes] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const minutesNum = parseInt(minutes);
    if (minutesNum > 0) {
      onConfirm(minutesNum);
      setMinutes("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl transform transition-all animate-scaleIn">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Vaxt Əlavə Et
          </h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              htmlFor="minutes"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Neçə dəqiqə əlavə etmək istəyirsiniz?
            </label>
            <input
              type="number"
              id="minutes"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              min="1"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-lg"
              placeholder="Dəqiqə sayını daxil edin"
              required
            />
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-6 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 cursor-pointer"
            >
              Ləğv et
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-6 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer"
            >
              Təsdiqlə
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TimeExtensionModal;
