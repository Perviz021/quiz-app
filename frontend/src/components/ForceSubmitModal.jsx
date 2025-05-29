import React from "react";

const ForceSubmitModal = ({ isOpen, onClose, onConfirm, studentName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          İmtahanı Bitir
        </h3>
        <p className="text-gray-600 mb-6">
          {studentName} adlı tələbənin imtahanını bitirmək istədiyinizə
          əminsiniz?
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium focus:outline-none cursor-pointer"
          >
            Ləğv et
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 cursor-pointer"
          >
            İmtahanı Bitir
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForceSubmitModal;
