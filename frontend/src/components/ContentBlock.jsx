/**
 * ContentBlock.jsx
 *
 * Replaces the inline ContentBlock defined inside Exam.jsx and Review.jsx.
 * Import this file in both pages instead of defining it locally.
 *
 * Renders:
 *  - Plain text (with <br> support from the backend)
 *  - LaTeX formulas via KaTeX ($...$ and $$...$$)
 *  - Images stored as relative paths (uploads/questions/...)
 *
 * Usage:
 *   <ContentBlock text={q.question} imagePath={q.question_image} prefix="1." />
 */

import MathRenderer from "./MathRenderer";

const IMAGE_BASE = "http://localhost:5000";

const getImageUrl = (imageValue) => {
  if (!imageValue) return null;
  if (typeof imageValue !== "string") return null;
  if (imageValue.startsWith("http://") || imageValue.startsWith("https://"))
    return imageValue;
  if (imageValue.startsWith("uploads/"))
    return `${IMAGE_BASE}/api/${imageValue}`;
  if (imageValue.startsWith("/api/")) return `${IMAGE_BASE}${imageValue}`;
  if (imageValue.startsWith("api/uploads/"))
    return `${IMAGE_BASE}/${imageValue}`;
  return `${IMAGE_BASE}/api/${imageValue}`;
};

const ContentBlock = ({ text, imagePath, prefix = "" }) => {
  const hasText = text && text.trim().length > 0;
  const hasImage = imagePath && imagePath.trim().length > 0;

  // Prepend number/prefix to text if given
  const fullText =
    prefix && hasText ? `${prefix} ${text}` : hasText ? text : null;

  // Prefix with no text (image-only question that still needs a number)
  const prefixOnly = prefix && !hasText;

  return (
    <span className="inline-block w-full">
      {prefixOnly && <span className="font-semibold">{prefix} </span>}
      {fullText && <MathRenderer text={fullText} />}
      {hasImage && (
        <img
          src={getImageUrl(imagePath) || undefined}
          alt="content"
          className="max-w-full max-h-64 object-contain rounded-lg mt-2 block"
        />
      )}
    </span>
  );
};

export default ContentBlock;
