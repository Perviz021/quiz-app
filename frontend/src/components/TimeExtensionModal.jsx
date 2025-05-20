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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Vaxt Əlavə Et</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Dəqiqə sayını daxil edin"
              required
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Ləğv et
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
