const Popup = ({ score, onClose }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center backdrop-blur-2xl bg-opacity-50">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md text-center transform transition-all duration-300 scale-100">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">İmtahan Bitdi</h2>
        <p className="text-lg text-gray-700 mb-6">
          Balınız:{" "}
          <span className="font-semibold text-indigo-600">{score}</span>
        </p>
        <button
          onClick={onClose}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 cursor-pointer"
        >
          Bağla
        </button>
      </div>
    </div>
  );
};

export default Popup;
