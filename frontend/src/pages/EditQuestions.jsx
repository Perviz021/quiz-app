import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API_BASE from "../config/api";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import AddQuestion from "./AddQuestion";
import ContentBlock from "../components/ContentBlock";
import useAuthImage from "../hooks/useAuthImage";

// server.js: app.use("/api/uploads", express.static("uploads"))
// so full URL = http://localhost:5000/api/uploads/questions/filename.jpg
const IMAGE_BASE = "http://localhost:5000";

const getImageUrl = (imageValue) => {
  if (!imageValue) return null;
  if (typeof imageValue !== "string") return null;
  if (imageValue.startsWith("http://") || imageValue.startsWith("https://")) {
    return imageValue;
  }
  // Backend stores relative paths like: uploads/questions/<file>
  if (imageValue.startsWith("uploads/")) {
    return `${IMAGE_BASE}/api/${imageValue}`;
  }
  if (imageValue.startsWith("/api/")) {
    return `${IMAGE_BASE}${imageValue}`;
  }
  if (imageValue.startsWith("api/uploads/")) {
    return `${IMAGE_BASE}/${imageValue}`;
  }
  // Fallback: treat as relative to api/uploads
  return `${IMAGE_BASE}/api/${imageValue}`;
};

const FIELD_LABEL =
  "block text-[11px] font-bold text-slate-500 uppercase tracking-wider montserrat mb-1.5";
const FIELD_INPUT =
  "w-full p-2.5 border border-border rounded-lg text-sm inter focus:ring-2 focus:ring-navy/25 focus:border-navy outline-none transition-all bg-slate-50 focus:bg-white";

// ─────────────────────────────────────────────
// Authenticated image — fetches with JWT so the secured endpoint works
// ─────────────────────────────────────────────
const AuthImg = ({ imageValue, className }) => {
  const fullUrl = getImageUrl(imageValue);
  const blobUrl = useAuthImage(fullUrl);

  if (!blobUrl) {
    return (
      <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 text-xs inter">
        <svg
          className="w-4 h-4 animate-pulse"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M21 3H3m18 0v18M3 3v18"
          />
        </svg>
        Yüklənir...
      </div>
    );
  }

  return <img src={blobUrl} alt="field" className={className} />;
};

// ─────────────────────────────────────────────
// Image editor used inside each edit card
// Shows full preview if image exists, upload button if not
// ─────────────────────────────────────────────
const ImageFieldEditor = ({ fieldKey, imageValue, subjectCode, onChange }) => {
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error(
        "Yalnız şəkil faylları (.jpg, .png, .gif, .webp) dəstəklənir",
      );
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Şəkil 5MB-dan böyük ola bilməz");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(
        `${API_BASE}/questions/upload-image?subjectCode=${encodeURIComponent(subjectCode || "unknown")}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          body: formData,
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Şəkil yüklənmədi");
      onChange(fieldKey, data.path);
      toast.success("Şəkil uğurla yükləndi");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = async () => {
    try {
      await fetch(`${API_BASE}/questions/delete-image`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ path: imageValue }),
      });
    } catch {
      // ignore — still clear from UI
    }
    onChange(fieldKey, null);
  };

  if (imageValue) {
    return (
      <div className="relative inline-block mt-2 group">
        <AuthImg
          imageValue={imageValue}
          className="max-h-48 max-w-full rounded-lg border border-border shadow-sm object-contain bg-slate-50 p-1"
        />
        <button
          type="button"
          onClick={handleRemove}
          className="absolute -top-2 -right-2 w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-700 shadow-md transition-colors cursor-pointer"
          title="Şəkli sil"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <label
      className={`inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 text-sm text-slate-600 inter cursor-pointer hover:border-gold hover:text-navy hover:bg-gold-pale/40 transition-all ${
        uploading ? "opacity-60 pointer-events-none" : ""
      }`}
    >
      {uploading ? (
        <>
          <span className="animate-spin inline-block">⏳</span> Yüklənir...
        </>
      ) : (
        <>
          🖼 Şəkil əlavə et
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </>
      )}
    </label>
  );
};

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
const EditQuestions = () => {
  const { subjectCode, lang } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editedQuestions, setEditedQuestions] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Navigation states
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [questionsPerPage] = useState(20);
  const [jumpToNumber, setJumpToNumber] = useState("");
  const [navOpen, setNavOpen] = useState(false);
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
        },
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

  // Called by ImageFieldEditor inside edit cards
  const handleImageChange = (questionId, field, value) => {
    setEditedQuestions((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], [field]: value },
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
        },
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
        },
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

        if (
          !question ||
          !option1 ||
          !option2 ||
          !option3 ||
          !option4 ||
          !option5
        ) {
          throw new Error(
            `Sətir ${rowNumber}: sual və bütün variantlar mütləq doldurulmalıdır`,
          );
        }

        const correctOption = variantLetterToNumber(getCell("düzgün_variant"));

        if (!correctOption) {
          throw new Error(
            `Sətir ${rowNumber}: düzgün_variant A, B, C, D və ya E olmalıdır`,
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
        }`,
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
    indexOfLastQuestion,
  );

  // Scroll to question
  const scrollToQuestion = (index) => {
    const actualIndex = filteredQuestions.findIndex(
      (q) => q.id === currentQuestions[index]?.id,
    );
    if (actualIndex !== -1) {
      const globalIndex = questions.findIndex(
        (q) => q.id === filteredQuestions[actualIndex]?.id,
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

      const targetPage = Math.ceil((questionIndex + 1) / questionsPerPage);
      setCurrentPage(targetPage);

      setTimeout(() => {
        questionRefs.current[globalIndex]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);

      setJumpToNumber("");
    } else {
      toast.error(
        `Xahiş edirik 1 ilə ${filteredQuestions.length} arasında bir rəqəm daxil edin`,
      );
    }
  };

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-surface">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-navy border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-navy-mid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-gold-light text-[11px] font-semibold tracking-widest uppercase montserrat mb-1">
              Sualların idarə edilməsi
            </p>
            <h1 className="text-white text-2xl sm:text-3xl font-bold montserrat-700 leading-tight">
              Sualları redaktə et —{" "}
              <span className="text-gold-light">{subjectCode}</span>
            </h1>
            <p className="text-slate-300 text-sm inter mt-1">
              Dil: {lang} · {filteredQuestions.length} sual
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-semibold rounded-lg cursor-pointer transition-colors duration-200 montserrat-600"
            >
              📥 Excel import
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg cursor-pointer transition-colors duration-200 montserrat-600"
            >
              {showAddForm ? "Formu gizlət" : "+ Yeni sual əlavə et"}
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg cursor-pointer transition-colors montserrat-600"
            >
              Geri
            </button>
          </div>
        </div>
        <svg
          viewBox="0 0 1440 24"
          className="w-full block"
          preserveAspectRatio="none"
          style={{ height: "24px" }}
        >
          <path
            d="M0,24 C360,0 1080,0 1440,24 L1440,24 L0,24 Z"
            fill="var(--color-surface, #f4f6fa)"
          />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Navigation Controls */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4 sm:p-5 mb-6 space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <label className={FIELD_LABEL}>Axtarış</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sual və ya variantda axtar..."
                className={FIELD_INPUT}
              />
            </div>

            {/* Jump to Question */}
            <div className="flex gap-2 items-end">
              <div>
                <label className={FIELD_LABEL}>Suala keç</label>
                <div className="flex gap-2 items-end">
                  <input
                    type="number"
                    value={jumpToNumber}
                    onChange={(e) => setJumpToNumber(e.target.value)}
                    placeholder="№"
                    min="1"
                    max={filteredQuestions.length}
                    className={`${FIELD_INPUT} w-20`}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleJumpToQuestion();
                      }
                    }}
                  />
                  <button
                    onClick={handleJumpToQuestion}
                    className="px-4 py-2.5 bg-navy hover:bg-navy-light text-white text-sm font-semibold rounded-lg cursor-pointer transition-colors duration-200 montserrat-600 h-[42px] shrink-0"
                  >
                    Keç
                  </button>
                </div>
              </div>
            </div>

            {/* Question Count */}
            <div className="text-sm text-slate-600 inter self-end pb-1">
              <span className="font-semibold montserrat-600 text-navy">
                {filteredQuestions.length} sual
              </span>
              {searchQuery && (
                <span className="text-slate-500">
                  {" "}
                  (cəmi {questions.length} sualdan)
                </span>
              )}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-border rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inter"
                >
                  Əvvəlki
                </button>
                <span className="text-sm text-slate-700 inter">
                  Səhifə {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-border rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inter"
                >
                  Növbəti
                </button>
              </div>
              <div className="text-sm text-slate-600 inter">
                {indexOfFirstQuestion + 1} -{" "}
                {Math.min(indexOfLastQuestion, filteredQuestions.length)} /{" "}
                {filteredQuestions.length}
              </div>
            </div>
          )}
        </div>

        {/* Add New Question Form — imported component */}
        {showAddForm && (
          <AddQuestion
            subjectCode={subjectCode}
            lang={lang}
            onSuccess={() => {
              setShowAddForm(false);
              fetchQuestions();
            }}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {currentQuestions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-border shadow-sm p-10 text-center">
                <p className="text-slate-600 text-lg montserrat-600">
                  {searchQuery
                    ? "Axtarışa uyğun sual tapılmadı"
                    : "Sual tapılmadı"}
                </p>
              </div>
            ) : (
              currentQuestions.map((question) => {
                const globalIndex = questions.findIndex(
                  (q) => q.id === question.id,
                );
                const displayNumber =
                  filteredQuestions.findIndex((q) => q.id === question.id) + 1;
                const eq = editedQuestions[question.id] || {};

                return (
                  <div
                    key={question.id}
                    ref={(el) => (questionRefs.current[globalIndex] = el)}
                    className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4"
                  >
                    {/* ── Question field ── */}
                    <div>
                      <label className={FIELD_LABEL}>
                        Sual {displayNumber}
                        {searchQuery && (
                          <span className="text-slate-400 font-normal normal-case tracking-normal ml-2">
                            (ID: {question.id})
                          </span>
                        )}
                      </label>
                      <textarea
                        value={eq.question || ""}
                        rows={3}
                        className={FIELD_INPUT}
                        onChange={(e) =>
                          handleInputChange(
                            question.id,
                            "question",
                            e.target.value,
                          )
                        }
                        placeholder="Sual mətni (istəyə görə)"
                      />
                      <ImageFieldEditor
                        fieldKey="question_image"
                        imageValue={eq.question_image || null}
                        subjectCode={subjectCode}
                        onChange={(field, val) =>
                          handleImageChange(question.id, field, val)
                        }
                      />
                    </div>

                    {/* ── Option fields ── */}
                    {[1, 2, 3, 4, 5].map((num) => (
                      <div key={num}>
                        <label className={FIELD_LABEL}>
                          Variant {String.fromCharCode(64 + num)}
                        </label>
                        <input
                          type="text"
                          value={eq[`option${num}`] || ""}
                          className={FIELD_INPUT}
                          onChange={(e) =>
                            handleInputChange(
                              question.id,
                              `option${num}`,
                              e.target.value,
                            )
                          }
                          placeholder={`Variant ${String.fromCharCode(
                            64 + num,
                          )} mətni (istəyə görə)`}
                        />
                        <ImageFieldEditor
                          fieldKey={`option${num}_image`}
                          imageValue={eq[`option${num}_image`] || null}
                          subjectCode={subjectCode}
                          onChange={(field, val) =>
                            handleImageChange(question.id, field, val)
                          }
                        />
                      </div>
                    ))}

                    {/* Rendered view (same content style as Exam/Review) */}
                    <div className="pt-2">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                        <p className="font-semibold text-gray-900 text-base leading-relaxed inter">
                          <ContentBlock
                            text={eq.question || ""}
                            prefix={`${displayNumber}.`}
                          />
                        </p>
                        {eq.question_image && (
                          <AuthImg
                            imageValue={eq.question_image}
                            className="max-h-64 max-w-full rounded-lg border border-border shadow-sm object-contain bg-white p-1"
                          />
                        )}
                        <div className="space-y-2">
                          {[1, 2, 3, 4, 5].map((num) => (
                            <div
                              key={`rendered-opt-${num}`}
                              className="rounded-lg border border-slate-200 bg-white p-3"
                            >
                              <ContentBlock
                                text={eq[`option${num}`] || ""}
                                prefix={`${String.fromCharCode(64 + num)}.`}
                              />
                              {eq[`option${num}_image`] && (
                                <AuthImg
                                  imageValue={eq[`option${num}_image`]}
                                  className="max-h-48 max-w-full rounded-lg border border-border shadow-sm object-contain bg-slate-50 p-1"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* ── Correct answer + action buttons ── */}
                    <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end pt-4 border-t border-border">
                      <div className="flex-1">
                        <label className={FIELD_LABEL}>Düzgün cavab</label>
                        <select
                          value={eq.correct_option || 1}
                          className={`${FIELD_INPUT} cursor-pointer`}
                          onChange={(e) =>
                            handleInputChange(
                              question.id,
                              "correct_option",
                              e.target.value,
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

                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleQuestionUpdate(question.id)}
                          className="px-4 py-2.5 bg-navy hover:bg-navy-light text-white text-sm font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/30 focus:ring-offset-2 transition-colors duration-200 cursor-pointer montserrat-700"
                        >
                          Yenilə
                        </button>
                        <button
                          onClick={() => handleDeleteClick(question.id)}
                          className="px-4 py-2.5 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:ring-offset-2 transition-colors duration-200 cursor-pointer montserrat-700"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Sticky Navigation Panel ── */}
          {questions.length > 10 && (
            <>
              {/* Backdrop — clicking it closes the panel */}
              {navOpen && (
                <div
                  className="hidden lg:block fixed inset-0 z-40"
                  onClick={() => setNavOpen(false)}
                />
              )}

              {/* Pull tab — always visible, opens panel on click */}
              <button
                onClick={() => setNavOpen((o) => !o)}
                className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-50 flex-col items-center bg-navy border border-gold/40 border-r-0 rounded-l-xl px-2 py-4 shadow-lg gap-2 cursor-pointer transition-colors hover:bg-navy-light"
                title="Naviqasiya panelini aç"
              >
                <svg
                  className={`w-4 h-4 text-gold-light transition-transform duration-300 ${navOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span
                  className="text-gold-light text-[10px] font-bold montserrat-700 tracking-widest uppercase"
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                  }}
                >
                  Naviqasiya
                </span>
              </button>

              {/* Slide-in panel — controlled by navOpen state, no hover gap issue */}
              <div
                className={`hidden lg:flex fixed top-20 z-50 w-72 bg-navy border-l border-t border-b border-gold/20 shadow-2xl rounded-l-2xl flex-col transition-all duration-300 ease-in-out ${
                  navOpen ? "right-0" : "-right-72"
                }`}
                style={{ maxHeight: "calc(100vh - 6rem)" }}
              >
                {/* Panel header */}
                <div className="bg-navy-mid px-4 py-3 flex-shrink-0 border-b border-white/10 rounded-tl-2xl">
                  <div className="flex items-center justify-between">
                    <p className="text-gold text-[10px] font-bold tracking-widest uppercase montserrat">
                      Sual Naviqasiyası
                    </p>
                    <button
                      onClick={() => setNavOpen(false)}
                      className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-colors"
                      title="Bağla"
                    >
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Legend + count */}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-gold" />
                      <span className="text-slate-300 text-[11px] inter">
                        Cari səhifə
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-white/20" />
                      <span className="text-slate-300 text-[11px] inter">
                        Digər
                      </span>
                    </div>
                    <span className="ml-auto text-[11px] font-bold text-white montserrat-700">
                      {filteredQuestions.length} sual
                    </span>
                  </div>
                </div>

                {/* Question grid — scrollable */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                  {filteredQuestions.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-6 inter">
                      Sual tapılmadı
                    </p>
                  ) : (
                    Array.from({
                      length: Math.ceil(
                        filteredQuestions.length / questionsPerPage,
                      ),
                    }).map((_, pageIdx) => {
                      const pageStart = pageIdx * questionsPerPage;
                      const pageEnd = Math.min(
                        pageStart + questionsPerPage,
                        filteredQuestions.length,
                      );
                      const isActivePage = pageIdx + 1 === currentPage;

                      return (
                        <div key={pageIdx}>
                          {/* Page label */}
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`text-[10px] font-bold montserrat-700 tracking-wider uppercase px-2 py-0.5 rounded-full ${
                                isActivePage
                                  ? "bg-gold text-navy"
                                  : "bg-white/10 text-slate-400"
                              }`}
                            >
                              Səh. {pageIdx + 1}
                            </span>
                            <div className="flex-1 h-px bg-white/10" />
                          </div>

                          {/* 5-column button grid */}
                          <div className="grid grid-cols-5 gap-1.5">
                            {filteredQuestions
                              .slice(pageStart, pageEnd)
                              .map((q, slotIdx) => {
                                const index = pageStart + slotIdx;
                                const globalIndex = questions.findIndex(
                                  (question) => question.id === q.id,
                                );
                                const isOnCurrentPage =
                                  index >= indexOfFirstQuestion &&
                                  index < indexOfLastQuestion;

                                return (
                                  <button
                                    key={q.id}
                                    onClick={() => {
                                      const targetPage = Math.ceil(
                                        (index + 1) / questionsPerPage,
                                      );
                                      setCurrentPage(targetPage);
                                      setTimeout(() => {
                                        questionRefs.current[
                                          globalIndex
                                        ]?.scrollIntoView({
                                          behavior: "smooth",
                                          block: "center",
                                        });
                                      }, 100);
                                    }}
                                    title={`Sual ${index + 1}`}
                                    className={`w-full aspect-square flex items-center justify-center rounded-lg text-[11px] font-bold montserrat-700 transition-all duration-150 hover:scale-110 cursor-pointer ${
                                      isOnCurrentPage
                                        ? "bg-gold text-navy shadow-md"
                                        : "bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white"
                                    }`}
                                  >
                                    {index + 1}
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Panel footer — pagination controls */}
                <div className="flex-shrink-0 px-4 py-3 border-t border-white/10 bg-navy-mid rounded-bl-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] inter">
                      {indexOfFirstQuestion + 1}–
                      {Math.min(indexOfLastQuestion, filteredQuestions.length)}{" "}
                      / {filteredQuestions.length}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                        className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center transition-colors"
                      >
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                      </button>
                      <span className="text-white text-[11px] font-bold montserrat-700 px-1">
                        {currentPage}/{totalPages}
                      </span>
                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center transition-colors"
                      >
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Import Questions Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-200 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-border max-h-[90vh] overflow-hidden flex flex-col">
              <div className="bg-navy-mid px-6 py-5 shrink-0">
                <p className="text-gold-light text-[11px] font-semibold tracking-widest uppercase montserrat mb-1">
                  Excel import
                </p>
                <h3 className="text-xl font-bold text-white montserrat-700">
                  Sualları fayldan yüklə
                </h3>
                <p className="text-slate-300 text-sm inter mt-1">
                  {subjectCode} · {lang}
                </p>
              </div>
              <div className="baau-gold-divider mx-6 mt-4 shrink-0" />

              <div className="p-6 pt-5 overflow-y-auto space-y-5">
                <div className="rounded-xl border border-border bg-slate-50/80 p-4">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider montserrat mb-2">
                    Sütun adları
                  </p>
                  <p className="text-xs text-slate-600 inter leading-relaxed">
                    <span className="font-semibold text-navy">sual</span>,{" "}
                    <span className="font-semibold text-navy">variant A</span> …{" "}
                    <span className="font-semibold text-navy">variant E</span>,{" "}
                    <span className="font-semibold text-navy">
                      düzgün_variant
                    </span>{" "}
                    (A–E). Birinci sətir başlıqdır.
                  </p>
                </div>

                <div>
                  <label className={FIELD_LABEL}>Excel faylı seçin</label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className={`${FIELD_INPUT} cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-navy file:text-white hover:file:bg-navy-light`}
                    disabled={isImporting}
                  />
                  {importFile && (
                    <p className="text-sm text-slate-600 inter mt-2">
                      <span className="font-semibold text-navy montserrat-600">
                        Seçilmiş:
                      </span>{" "}
                      {importFile.name}
                    </p>
                  )}
                </div>

                {importResult && (
                  <div
                    className={`p-4 rounded-xl border ${
                      importResult.errorCount > 0
                        ? "bg-amber-50/90 border-amber-200"
                        : "bg-emerald-50/90 border-emerald-200"
                    }`}
                  >
                    <h4 className="font-bold text-navy montserrat-700 mb-2 text-sm">
                      Import nəticəsi
                    </h4>
                    <p className="text-sm inter text-slate-700">
                      Uğurlu:{" "}
                      <span className="font-semibold text-emerald-700">
                        {importResult.successCount}
                      </span>{" "}
                      sual
                      {importResult.errorCount > 0 && (
                        <>
                          <br />
                          Xəta:{" "}
                          <span className="font-semibold text-red-600">
                            {importResult.errorCount}
                          </span>{" "}
                          sual
                        </>
                      )}
                      <br />
                      Cəmi:{" "}
                      <span className="font-semibold">
                        {importResult.total}
                      </span>{" "}
                      sətir
                    </p>
                    {importResult.errors && importResult.errors.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-amber-200/80">
                        <p className="text-xs font-bold text-slate-600 montserrat mb-1">
                          Xətalar
                        </p>
                        <ul className="text-xs list-disc list-inside space-y-0.5 text-red-700 inter">
                          {importResult.errors.map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setImportFile(null);
                      setImportResult(null);
                    }}
                    disabled={isImporting}
                    className="flex-1 py-3 px-6 rounded-xl border-2 border-border text-slate-700 font-bold hover:bg-slate-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:ring-offset-2 cursor-pointer disabled:opacity-50 montserrat-600"
                  >
                    Ləğv et
                  </button>
                  <button
                    onClick={handleImportQuestions}
                    disabled={!importFile || isImporting}
                    className="flex-1 py-3 px-6 rounded-xl bg-navy hover:bg-navy-light text-white font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-navy/40 focus:ring-offset-2 cursor-pointer disabled:bg-slate-400 disabled:cursor-not-allowed montserrat-700"
                  >
                    {isImporting ? "Import edilir..." : "Import et"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-200 p-4">
            <div className="bg-white rounded-2xl border border-border max-w-md w-full mx-auto shadow-2xl overflow-hidden">
              <div className="bg-navy-mid px-6 py-4">
                <p className="text-gold-light text-[11px] font-semibold tracking-widest uppercase montserrat">
                  Diqqət
                </p>
                <h3 className="text-xl font-bold text-white montserrat-700 mt-1">
                  Sualı silmək
                </h3>
              </div>
              <div className="p-8 text-center">
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
                <p className="text-slate-600 text-base inter">
                  Bu sualı silmək istədiyinizə əminsiniz?
                </p>
                <p className="text-slate-500 text-sm inter mt-2">
                  Bu əməliyyat geri alına bilməz.
                </p>
                <div className="flex gap-3 mt-8">
                  <button
                    onClick={handleDeleteCancel}
                    className="flex-1 py-3 px-6 rounded-xl border-2 border-border text-slate-700 font-bold hover:bg-slate-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:ring-offset-2 cursor-pointer montserrat-600"
                  >
                    Ləğv et
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    className="flex-1 py-3 px-6 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:ring-offset-2 cursor-pointer montserrat-700"
                  >
                    Bəli, sil
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditQuestions;
