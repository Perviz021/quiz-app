import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API_BASE from "../config/api";
import { toast } from "react-toastify";

const EditQuestions = () => {
  const { subjectCode, lang } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editedQuestions, setEditedQuestions] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);

  useEffect(() => {
    fetchQuestions();
  }, [subjectCode, lang]);

  const fetchQuestions = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/export-questions/${subjectCode}?lang=${lang}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch questions");
      }

      const data = await response.json();
      setQuestions(data);
      // Initialize edited questions state
      const initialEdited = {};
      data.forEach((q) => {
        initialEdited[q.id] = { ...q };
      });
      setEditedQuestions(initialEdited);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (questionId, field, value) => {
    setEditedQuestions((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: field === "correct_option" ? parseInt(value) : value,
      },
    }));
  };

  const handleQuestionUpdate = async (questionId) => {
    try {
      const response = await fetch(
        `${API_BASE}/questions/update/${questionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(editedQuestions[questionId]),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update question");
      }

      toast.success("Sual uğurla yeniləndi");
      fetchQuestions(); // Refresh questions after update
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteClick = (questionId) => {
    setQuestionToDelete(questionId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!questionToDelete) return;

    try {
      const response = await fetch(
        `${API_BASE}/questions/delete/${questionToDelete}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete question");
      }

      toast.success("Sual uğurla silindi");
      setShowDeleteModal(false);
      setQuestionToDelete(null);
      fetchQuestions(); // Refresh questions after deletion
    } catch (error) {
      toast.error(error.message);
      setShowDeleteModal(false);
      setQuestionToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setQuestionToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">
          Sualları Redaktə Et - {subjectCode} ({lang})
        </h2>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer"
        >
          Geri
        </button>
      </div>

      <div className="space-y-6">
        {questions.map((question, index) => (
          <div
            key={question.id}
            className="bg-white rounded-xl shadow-md p-6 space-y-4"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sual {index + 1}
                </label>
                <textarea
                  value={editedQuestions[question.id]?.question || ""}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  onChange={(e) =>
                    handleInputChange(question.id, "question", e.target.value)
                  }
                />
              </div>

              {[1, 2, 3, 4, 5].map((num) => (
                <div key={num}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Variant {String.fromCharCode(64 + num)}
                  </label>
                  <input
                    type="text"
                    value={editedQuestions[question.id]?.[`option${num}`] || ""}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    onChange={(e) =>
                      handleInputChange(
                        question.id,
                        `option${num}`,
                        e.target.value
                      )
                    }
                  />
                </div>
              ))}

              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Düzgün cavab
                  </label>
                  <select
                    value={editedQuestions[question.id]?.correct_option || 1}
                    className="w-full p-2 border border-gray-300 rounded-md cursor-pointer"
                    onChange={(e) =>
                      handleInputChange(
                        question.id,
                        "correct_option",
                        e.target.value
                      )
                    }
                  >
                    {[1, 2, 3, 4, 5].map((num) => (
                      <option key={num} value={num}>
                        {String.fromCharCode(64 + num)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleQuestionUpdate(question.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 cursor-pointer"
                  >
                    Yenilə
                  </button>
                  <button
                    onClick={() => handleDeleteClick(question.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200 cursor-pointer"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-200">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl transform transition-all duration-200 scale-100">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Sualı Silmək
              </h3>
              <p className="text-gray-600 text-lg">
                Bu sualı silmək istədiyinizə əminsiniz?
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Bu əməliyyat geri alına bilməz.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleDeleteCancel}
                className="flex-1 py-3 px-6 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 cursor-pointer"
              >
                Ləğv et
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-3 px-6 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 cursor-pointer"
              >
                Bəli, Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditQuestions;
