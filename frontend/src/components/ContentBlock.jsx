/**
 * ContentBlock.jsx
 *
 * Renders text (with optional LaTeX via MathRenderer) and/or an image.
 * Images are fetched with the JWT token via useAuthImage so they work
 * even though the /api/uploads/questions endpoint now requires authentication.
 */

import useAuthImage from "../hooks/useAuthImage";
import MathRenderer from "./MathRenderer";

const IMAGE_BASE = "http://localhost:5000";

export const getImageUrl = (imageValue) => {
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

// ── Image sub-component — uses the auth hook ─────────────────────────────────
const AuthImage = ({
  imagePath,
  alt = "content",
  className = "",
  onImageClick,
}) => {
  // Build the full URL first, then fetch it with auth
  const fullUrl = getImageUrl(imagePath);
  const blobUrl = useAuthImage(fullUrl);

  if (!blobUrl) {
    // Show a subtle placeholder while loading
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 inter mt-2">
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
      </span>
    );
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      className={`max-w-full max-h-64 object-contain rounded-lg mt-2 block cursor-pointer hover:opacity-80 transition-opacity ${className}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onImageClick) {
          onImageClick(blobUrl);
        }
      }}
    />
  );
};

// ── Main exported component ───────────────────────────────────────────────────
const ContentBlock = ({ text, imagePath, prefix = "", onImageClick }) => {
  const hasText = text && text.trim().length > 0;
  const hasImage = imagePath && imagePath.trim().length > 0;

  const fullText =
    prefix && hasText ? `${prefix} ${text}` : hasText ? text : null;

  const prefixOnly = prefix && !hasText;

  return (
    <span className="inline-block w-full">
      {prefixOnly && <span className="font-semibold">{prefix} </span>}
      {fullText && <MathRenderer text={fullText} />}
      {hasImage && (
        <AuthImage imagePath={imagePath} onImageClick={onImageClick} />
      )}
    </span>
  );
};

export default ContentBlock;
