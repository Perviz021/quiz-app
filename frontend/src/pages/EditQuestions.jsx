import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API_BASE from "../config/api";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

const EditQuestions = () => {
  const { subjectCode, lang } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editedQuestions, setEditedQuestions] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question: "",
    option1: "",
    option2: "",
    option3: "",
    option4: "",
    option5: "",
    correct_option: 1,
  });
  const [isAdding, setIsAdding] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Navigation states
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [questionsPerPage] = useState(20);
  const [jumpToNumber, setJumpToNumber] = useState("");
  const questionRefs = useRef([]);

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

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    setIsAdding(true);

    try {
      const response = await fetch(`${API_BASE}/questions/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          ...newQuestion,
          subjectCode: subjectCode,
          lang: lang || "az",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add question");
      }

      toast.success("Sual uğurla əlavə edildi");
      setShowAddForm(false);
      setNewQuestion({
        question: "",
        option1: "",
        option2: "",
        option3: "",
        option4: "",
        option5: "",
        correct_option: 1,
      });
      fetchQuestions(); // Refresh questions list - new question will appear at the end
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleNewQuestionChange = (field, value) => {
    setNewQuestion((prev) => ({
      ...prev,
      [field]: field === "correct_option" ? parseInt(value) : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      setImportFile(file);
    } else {
      toast.error("Yalnız Excel faylları (.xlsx, .xls) dəstəklənir");
      setImportFile(null);
    }
  };

  const variantLetterToNumber = (value) => {
    const map = { A: 1, B: 2, C: 3, D: 4, E: 5 };
    return (
      map[
        String(value || "")
          .trim()
          .toUpperCase()
      ] || null
    );
  };

  const handleImportQuestions = async () => {
    if (!importFile) {
      toast.error("Zəhmət olmasa bir fayl seçin");
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const fileBuffer = await importFile.arrayBuffer();
      const workbook = XLSX.read(fileBuffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (!rows.length) {
        throw new Error("Excel faylında məlumat tapılmadı");
      }

      const questionsData = rows.map((row, index) => {
        const rowNumber = index + 2; // Excel row number (header = row 1)

        const getCell = (key) => {
          const value = row[key];
          if (value === undefined || value === null) return "";
          return String(value).trim();
        };

        const question = getCell("sual");
        const option1 = getCell("variant A");
        const option2 = getCell("variant B");
        const option3 = getCell("variant C");
        const option4 = getCell("variant D");
        const option5 = getCell("variant E");

        // ✅ STRICT mandatory check
        if (
          !question ||
          !option1 ||
          !option2 ||
          !option3 ||
          !option4 ||
          !option5
        ) {
          throw new Error(
            `Sətir ${rowNumber}: sual və bütün variantlar mütləq doldurulmalıdır`
          );
        }

        const correctOption = variantLetterToNumber(getCell("düzgün_variant"));

        if (!correctOption) {
          throw new Error(
            `Sətir ${rowNumber}: düzgün_variant A, B, C, D və ya E olmalıdır`
          );
        }

        return {
          question,
          option1,
          option2,
          option3,
          option4,
          option5,
          correct_option: correctOption,
        };
      });

      if (!questionsData.length) {
        throw new Error("Excel faylında sual tapılmadı");
      }

      const response = await fetch(`${API_BASE}/questions/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          questions: questionsData,
          subjectCode,
          lang: lang || "az",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Import xətası");
      }

      setImportResult(result);
      toast.success(
        `${result.successCount} sual uğurla əlavə edildi${
          result.errorCount > 0
            ? `. ${result.errorCount} sual xəta ilə qarşılaşdı`
            : ""
        }`
      );

      // Refresh questions list
      fetchQuestions();

      // Close modal after a delay
      setTimeout(() => {
        setShowImportModal(false);
        setImportFile(null);
        setImportResult(null);
      }, 3000);
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error.message || "Import xətası");
    } finally {
      setIsImporting(false);
    }
  };

  // Filter questions based on search query
  const filteredQuestions = questions.filter((q) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const questionText = (q.question || "").toLowerCase();
    const options = [q.option1, q.option2, q.option3, q.option4, q.option5]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return questionText.includes(query) || options.includes(query);
  });

  // Pagination
  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);
  const indexOfLastQuestion = currentPage * questionsPerPage;
  const indexOfFirstQuestion = indexOfLastQuestion - questionsPerPage;
  const currentQuestions = filteredQuestions.slice(
    indexOfFirstQuestion,
    indexOfLastQuestion
  );

  // Scroll to question
  const scrollToQuestion = (index) => {
    const actualIndex = filteredQuestions.findIndex(
      (q) => q.id === currentQuestions[index]?.id
    );
    if (actualIndex !== -1) {
      const globalIndex = questions.findIndex(
        (q) => q.id === filteredQuestions[actualIndex]?.id
      );
      questionRefs.current[globalIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  // Jump to question number
  const handleJumpToQuestion = () => {
    const num = parseInt(jumpToNumber);
    if (num >= 1 && num <= filteredQuestions.length) {
      const questionIndex = num - 1;
      const question = filteredQuestions[questionIndex];
      const globalIndex = questions.findIndex((q) => q.id === question.id);

      // Calculate which page this question is on
      const targetPage = Math.ceil((questionIndex + 1) / questionsPerPage);
      setCurrentPage(targetPage);

      // Scroll to the question after a short delay to allow page change
      setTimeout(() => {
        questionRefs.current[globalIndex]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);

      setJumpToNumber("");
    } else {
      toast.error(
        `Xahiş edirik 1 ilə ${filteredQuestions.length} arasında bir rəqəm daxil edin`
      );
    }
  };

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-3xl font-bold text-gray-900">
          Sualları Redaktə Et - {subjectCode} ({lang})
        </h2>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors duration-200"
          >
            📥 Excel faylından Import
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer transition-colors duration-200"
          >
            {showAddForm ? "Formu gizlət" : "+ Yeni sual əlavə et"}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer"
          >
            Geri
          </button>
        </div>
      </div>

      {/* Search and Navigation Controls */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6 space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Axtarış
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sual və ya variantda axtar..."
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Jump to Question */}
          <div className="flex gap-2 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Suala keç
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={jumpToNumber}
                  onChange={(e) => setJumpToNumber(e.target.value)}
                  placeholder="№"
                  min="1"
                  max={filteredQuestions.length}
                  className="w-20 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleJumpToQuestion();
                    }
                  }}
                />
                <button
                  onClick={handleJumpToQuestion}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 cursor-pointer transition-colors duration-200"
                >
                  Keç
                </button>
              </div>
            </div>
          </div>

          {/* Question Count */}
          <div className="text-sm text-gray-600">
            <span className="font-semibold">
              {filteredQuestions.length} sual
            </span>
            {searchQuery && (
              <span className="text-gray-500">
                {" "}
                (cəmi {questions.length} sualdan)
              </span>
            )}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Əvvəlki
              </button>
              <span className="text-sm text-gray-700">
                Səhifə {currentPage} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Növbəti
              </button>
            </div>
            <div className="text-sm text-gray-600">
              {indexOfFirstQuestion + 1} -{" "}
              {Math.min(indexOfLastQuestion, filteredQuestions.length)} /{" "}
              {filteredQuestions.length}
            </div>
          </div>
        )}
      </div>

      {/* Add New Question Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border-2 border-green-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Yeni sual əlavə et
          </h3>
          <form onSubmit={handleAddQuestion} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sual *
              </label>
              <textarea
                value={newQuestion.question}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-md"
                onChange={(e) =>
                  handleNewQuestionChange("question", e.target.value)
                }
                required
                placeholder="Sualın mətni"
              />
            </div>

            {[1, 2, 3, 4, 5].map((num) => (
              <div key={num}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variant {String.fromCharCode(64 + num)}
                </label>
                <input
                  type="text"
                  value={newQuestion[`option${num}`] || ""}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  onChange={(e) =>
                    handleNewQuestionChange(`option${num}`, e.target.value)
                  }
                  required={num === 1}
                  placeholder={`Variant ${String.fromCharCode(64 + num)}`}
                />
              </div>
            ))}

            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Düzgün cavab *
                </label>
                <select
                  value={newQuestion.correct_option}
                  className="w-full p-2 border border-gray-300 rounded-md cursor-pointer"
                  onChange={(e) =>
                    handleNewQuestionChange("correct_option", e.target.value)
                  }
                  required
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
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewQuestion({
                      question: "",
                      option1: "",
                      option2: "",
                      option3: "",
                      option4: "",
                      option5: "",
                      correct_option: 1,
                    });
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200 cursor-pointer"
                >
                  Ləğv et
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isAdding ? "Əlavə edilir..." : "Əlavə et"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {currentQuestions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <p className="text-gray-600 text-lg">
                {searchQuery
                  ? "Axtarışa uyğun sual tapılmadı"
                  : "Sual tapılmadı"}
              </p>
            </div>
          ) : (
            currentQuestions.map((question, pageIndex) => {
              const globalIndex = questions.findIndex(
                (q) => q.id === question.id
              );
              const displayNumber =
                filteredQuestions.findIndex((q) => q.id === question.id) + 1;

              return (
                <div
                  key={question.id}
                  ref={(el) => (questionRefs.current[globalIndex] = el)}
                  className="bg-white rounded-xl shadow-md p-6 space-y-4"
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sual {displayNumber}
                        {searchQuery && (
                          <span className="text-gray-500 text-xs ml-2">
                            (ID: {question.id})
                          </span>
                        )}
                      </label>
                      <textarea
                        value={editedQuestions[question.id]?.question || ""}
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        onChange={(e) =>
                          handleInputChange(
                            question.id,
                            "question",
                            e.target.value
                          )
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
                          value={
                            editedQuestions[question.id]?.[`option${num}`] || ""
                          }
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
                          value={
                            editedQuestions[question.id]?.correct_option || 1
                          }
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
              );
            })
          )}
        </div>

        {/* Sticky Navigation Panel */}
        {questions.length > 10 && (
          <div className="hidden lg:block fixed top-20 right-0 group z-40">
            {/* Visible Tab Trigger - Always visible on right edge */}
            <div className="fixed right-0 top-1/2 -translate-y-1/2 bg-white p-2 rounded-l-lg shadow-lg border border-gray-200 border-r-0 cursor-pointer z-50 group-hover:opacity-0 transition-opacity duration-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>

            {/* Navigation Panel - Slides in on hover */}
            <div className="fixed top-20 -right-64 w-64 p-4 bg-white border border-gray-200 shadow-xl rounded-l-2xl transition-all duration-300 max-h-[calc(100vh-6rem)] overflow-y-auto group-hover:right-4 hover:right-4 hover:shadow-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center sticky top-0 bg-white pb-2 border-b border-gray-200 z-10">
                Sual Naviqasiyası
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {filteredQuestions.map((q, index) => {
                  const globalIndex = questions.findIndex(
                    (question) => question.id === q.id
                  );
                  const isOnCurrentPage =
                    index >= indexOfFirstQuestion &&
                    index < indexOfLastQuestion;

                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        const targetPage = Math.ceil(
                          (index + 1) / questionsPerPage
                        );
                        setCurrentPage(targetPage);
                        setTimeout(() => {
                          questionRefs.current[globalIndex]?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                        }, 100);
                      }}
                      className={`w-10 h-10 flex items-center justify-center rounded-full font-semibold transition-all duration-200 text-sm ${
                        isOnCurrentPage
                          ? "bg-indigo-600 text-white hover:bg-indigo-700 ring-2 ring-indigo-300"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                      title={`Sual ${index + 1}`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
              {filteredQuestions.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Sual tapılmadı
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Import Questions Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-200">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl transform transition-all duration-200 scale-100 max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Excel Faylından Sualları Import Et
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Excel Faylı Seçin
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="w-full p-2 border border-gray-300 rounded-md cursor-pointer"
                  disabled={isImporting}
                />
                {importFile && (
                  <p className="text-sm text-gray-600 mt-2">
                    Seçilmiş fayl: {importFile.name}
                  </p>
                )}
              </div>

              {importResult && (
                <div
                  className={`p-4 rounded-lg ${
                    importResult.errorCount > 0
                      ? "bg-yellow-50 border border-yellow-200"
                      : "bg-green-50 border border-green-200"
                  }`}
                >
                  <h4 className="font-semibold mb-2">Import Nəticəsi:</h4>
                  <p className="text-sm">
                    ✅ Uğurlu: {importResult.successCount} sual
                    {importResult.errorCount > 0 && (
                      <>
                        <br />❌ Xəta: {importResult.errorCount} sual
                      </>
                    )}
                    <br />
                    📊 Cəmi: {importResult.total} sual
                  </p>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold">Xətalar:</p>
                      <ul className="text-xs list-disc list-inside mt-1">
                        {importResult.errors.map((error, idx) => (
                          <li key={idx} className="text-red-600">
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportResult(null);
                  }}
                  disabled={isImporting}
                  className="flex-1 py-3 px-6 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 cursor-pointer disabled:opacity-50"
                >
                  Ləğv et
                </button>
                <button
                  onClick={handleImportQuestions}
                  disabled={!importFile || isImporting}
                  className="flex-1 py-3 px-6 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isImporting ? "Import edilir..." : "Import Et"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
