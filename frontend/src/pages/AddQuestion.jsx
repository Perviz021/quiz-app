import { useState } from "react";
import API_BASE from "../config/api";
import { toast } from "react-toastify";
import MathEditor from "../components/MathEditor";
import PasteImageZone from "../components/PasteImageZone";

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
  return `${IMAGE_BASE}/api/${imageValue}`;
};

const FIELD_LABEL =
  "block text-[11px] font-bold text-slate-500 uppercase tracking-wider montserrat mb-1.5";
const FIELD_INPUT =
  "w-full p-2.5 border border-border rounded-lg text-sm inter focus:ring-2 focus:ring-navy/25 focus:border-navy outline-none transition-all bg-slate-50 focus:bg-white";

// ─────────────────────────────────────────────
// Single field: text input + image upload/preview/remove
// ─────────────────────────────────────────────
const QuestionField = ({
  label,
  fieldKey,
  textValue,
  imageSrc,
  hasImage,
  onTextChange,
  onImageSelected,
  onImageRemoved,
  isTextarea,
}) => {
  const handleRemoveImage = () => {
    onImageRemoved(fieldKey);
  };

  return (
    <div className="space-y-2">
      <label className={FIELD_LABEL}>{label}</label>

      {/* Text input — MathEditor supports LaTeX formulas */}
      {isTextarea ? (
        <MathEditor
          value={textValue}
          onChange={(val) => onTextChange(fieldKey, val)}
          rows={3}
          placeholder="Mətni daxil edin. Düstur: $\frac{a}{b}$ · Blok: $$\int_0^1 x\,dx$$"
        />
      ) : (
        <MathEditor
          value={textValue}
          onChange={(val) => onTextChange(fieldKey, val)}
          rows={2}
          placeholder="Variant mətni. Düstur: $\sqrt{x}$"
        />
      )}

      {/* Image preview OR paste zone */}
      {hasImage ? (
        <div className="relative inline-block mt-1">
          <img
            src={imageSrc}
            alt={label}
            className="max-h-48 max-w-full rounded-lg border border-border shadow-sm object-contain bg-slate-50 p-1"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-700 shadow-md transition-colors cursor-pointer"
            title="Şəkli sil"
          >
            ✕
          </button>
        </div>
      ) : (
        <PasteImageZone
          onFile={(file) => onImageSelected(fieldKey, file)}
          fieldLabel={label}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Main AddQuestion component
// Props: subjectCode, lang, onSuccess, onCancel
// ─────────────────────────────────────────────
const AddQuestion = ({ subjectCode, lang, onSuccess, onCancel }) => {
  const emptyForm = {
    question: "",
    question_image: null,
    option1: "",
    option1_image: null,
    option2: "",
    option2_image: null,
    option3: "",
    option3_image: null,
    option4: "",
    option4_image: null,
    option5: "",
    option5_image: null,
    correct_option: 1,
  };

  const [form, setForm] = useState(emptyForm);
  const [isAdding, setIsAdding] = useState(false);
  const [pendingImages, setPendingImages] = useState({});
  const [previewUrls, setPreviewUrls] = useState({});

  const handleTextChange = (fieldKey, value) => {
    setForm((prev) => ({ ...prev, [fieldKey]: value }));
  };

  const clearAllPreviewUrls = () => {
    Object.values(previewUrls).forEach((url) => URL.revokeObjectURL(url));
  };

  const handleImageSelected = (fieldKey, file) => {
    const imageKey = `${fieldKey}_image`;
    setPendingImages((prev) => ({ ...prev, [imageKey]: file }));
    setPreviewUrls((prev) => {
      if (prev[imageKey]) URL.revokeObjectURL(prev[imageKey]);
      return { ...prev, [imageKey]: URL.createObjectURL(file) };
    });
    setForm((prev) => ({ ...prev, [imageKey]: null }));
  };

  const handleImageRemoved = (fieldKey) => {
    const imageKey = `${fieldKey}_image`;
    setPendingImages((prev) => {
      const next = { ...prev };
      delete next[imageKey];
      return next;
    });
    setPreviewUrls((prev) => {
      if (prev[imageKey]) URL.revokeObjectURL(prev[imageKey]);
      const next = { ...prev };
      delete next[imageKey];
      return next;
    });
    setForm((prev) => ({ ...prev, [imageKey]: null }));
  };

  const uploadImage = async (file) => {
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
    return data.path;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Each field needs at least text OR image
    const fields = [
      { key: "question", label: "Sual" },
      { key: "option1", label: "Variant A" },
      { key: "option2", label: "Variant B" },
      { key: "option3", label: "Variant C" },
      { key: "option4", label: "Variant D" },
      { key: "option5", label: "Variant E" },
    ];
    for (const { key, label } of fields) {
      if (!form[key] && !form[`${key}_image`]) {
        toast.error(`${label} mətni və ya şəkli mütləqdir`);
        return;
      }
    }

    setIsAdding(true);
    try {
      const imagePaths = {};
      for (const [imageKey, file] of Object.entries(pendingImages)) {
        imagePaths[imageKey] = await uploadImage(file);
      }

      const res = await fetch(`${API_BASE}/questions/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          question: form.question,
          question_image: imagePaths.question_image || form.question_image,
          option1: form.option1,
          option1_image: imagePaths.option1_image || form.option1_image,
          option2: form.option2,
          option2_image: imagePaths.option2_image || form.option2_image,
          option3: form.option3,
          option3_image: imagePaths.option3_image || form.option3_image,
          option4: form.option4,
          option4_image: imagePaths.option4_image || form.option4_image,
          option5: form.option5,
          option5_image: imagePaths.option5_image || form.option5_image,
          correct_option: form.correct_option,
          subjectCode,
          lang: lang || "az",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sual əlavə edilmədi");

      toast.success("Sual uğurla əlavə edildi");
      clearAllPreviewUrls();
      setForm(emptyForm);
      setPendingImages({});
      setPreviewUrls({});
      onSuccess?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleCancel = () => {
    clearAllPreviewUrls();
    setForm(emptyForm);
    setPendingImages({});
    setPreviewUrls({});
    onCancel?.();
  };

  // Shared props builder for QuestionField
  const fieldProps = (fieldKey, label, isTextarea = false) => ({
    label,
    fieldKey,
    textValue: form[fieldKey],
    imageSrc:
      previewUrls[`${fieldKey}_image`] ||
      (form[`${fieldKey}_image`]
        ? getImageUrl(form[`${fieldKey}_image`])
        : null),
    hasImage: Boolean(
      previewUrls[`${fieldKey}_image`] || form[`${fieldKey}_image`],
    ),
    onTextChange: handleTextChange,
    onImageSelected: handleImageSelected,
    onImageRemoved: handleImageRemoved,
    isTextarea,
  });

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-6 sm:p-7 mb-6">
      <div className="mb-5">
        <p className="text-gold-light text-[11px] font-semibold tracking-widest uppercase montserrat mb-1">
          Yeni sual
        </p>
        <h3 className="text-xl font-bold text-navy montserrat-700">
          Sual əlavə et
        </h3>
        <div className="baau-gold-divider mt-3 max-w-xs" />
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <QuestionField {...fieldProps("question", "Sual *", true)} />

        {[1, 2, 3, 4, 5].map((num) => (
          <QuestionField
            key={num}
            {...fieldProps(
              `option${num}`,
              `Variant ${String.fromCharCode(64 + num)}`,
            )}
          />
        ))}

        <div className="flex flex-wrap gap-4 items-end pt-4 border-t border-border">
          <div className="flex-1 min-w-[160px]">
            <label className={FIELD_LABEL}>Düzgün cavab *</label>
            <select
              value={form.correct_option}
              className={`${FIELD_INPUT} cursor-pointer`}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  correct_option: parseInt(e.target.value),
                }))
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

          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2.5 border-2 border-border text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors cursor-pointer montserrat-600"
            >
              Ləğv et
            </button>
            <button
              type="submit"
              disabled={isAdding}
              className="px-4 py-2.5 bg-navy hover:bg-navy-light text-white text-sm font-bold rounded-lg transition-colors cursor-pointer disabled:bg-slate-400 disabled:cursor-not-allowed montserrat-700 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:ring-offset-2"
            >
              {isAdding ? "Əlavə edilir..." : "Əlavə et"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddQuestion;
