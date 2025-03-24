const Popup = ({ score, onClose }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center backdrop-blur-2xl bg-opacity-50">
      <div className="bg-gray-700 p-6 rounded-lg text-[#fff] shadow-lg w-96 text-center border-black">
        <h2 className="text-2xl font-bold mb-4">İmtahan bitdi</h2>
        <p className="text-lg">
          Balınız: <span className="font-semibold">{score}</span>
        </p>
        <button
          onClick={onClose}
          className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 cursor-pointer"
        >
          Bağla
        </button>
      </div>
    </div>
  );
};

export default Popup;
