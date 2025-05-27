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

                <button
                  onClick={() => handleQuestionUpdate(question.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 cursor-pointer"
                >
                  Yenilə
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EditQuestions;
