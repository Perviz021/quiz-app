import { useRef, useEffect, useState } from "react";
import { toast } from "react-toastify";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

let armedZoneId = null;

const isEditableElement = (element) => {
  if (!element) return false;
  const tagName = element.tagName;
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    element.isContentEditable === true
  );
};

const PasteImageZone = ({ onFile, uploading = false, fieldLabel = "" }) => {
  const zoneRef = useRef(null);
  const zoneIdRef = useRef(`paste-zone-${Math.random().toString(36).slice(2)}`);
  const [focused, setFocused] = useState(false);
  const [pasting, setPasting] = useState(false);

  const armZone = () => {
    armedZoneId = zoneIdRef.current;
  };

  const extractImageFromClipboard = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return null;

    for (const item of items) {
      if (item.kind === "file" && ALLOWED_TYPES.includes(item.type)) {
        return item.getAsFile();
      }
    }

    return null;
  };

  const handleFile = (file) => {
    if (!file) {
      toast.error("Mübadilə buferindən şəkil tapılmadı. Əvvəlcə şəkli kopyalayın.");
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Yalnız şəkil faylları (.jpg, .png, .gif, .webp) dəstəklənir");
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Şəkil 5 MB-dan böyük ola bilməz");
      return;
    }

    onFile(file);
  };

  const handleZonePaste = (e) => {
    e.preventDefault();
    e.stopPropagation();
    armZone();
    setPasting(true);
    const file = extractImageFromClipboard(e);
    handleFile(file);
    setPasting(false);
  };

  useEffect(() => {
    const handleGlobalPaste = (e) => {
      if (uploading) return;
      if (!zoneRef.current) return;
      if (armedZoneId !== zoneIdRef.current) return;

      const active = document.activeElement;
      if (isEditableElement(active) && active !== zoneRef.current) {
        return;
      }

      const file = extractImageFromClipboard(e);
      if (!file) return;

      e.preventDefault();
      handleFile(file);
    };

    document.addEventListener("paste", handleGlobalPaste);

    return () => {
      document.removeEventListener("paste", handleGlobalPaste);
      if (armedZoneId === zoneIdRef.current) {
        armedZoneId = null;
      }
    };
  }, [uploading, onFile]);

  const isDisabled = uploading || pasting;

  return (
    <div
      ref={zoneRef}
      tabIndex={0}
      role="button"
      aria-label={`${fieldLabel} — klikləyin və Ctrl+V ilə yapışdırın`}
      onMouseDown={armZone}
      onFocus={() => {
        setFocused(true);
        armZone();
      }}
      onBlur={() => setFocused(false)}
      onPaste={handleZonePaste}
      className={[
        "mt-1.5 flex flex-row items-center justify-center gap-2",
        "w-full rounded-lg border-2 border-dashed py-2 px-3",
        "cursor-pointer select-none outline-none transition-all duration-200",
        isDisabled
          ? "opacity-50 pointer-events-none border-slate-200 bg-slate-50"
          : focused
            ? "border-gold bg-gold-pale/30 text-navy"
            : "border-slate-300 bg-slate-50 hover:border-gold hover:bg-gold-pale/20 hover:text-navy text-slate-500",
      ].join(" ")}
    >
      {uploading || pasting ? (
        <>
          <svg
            className="w-4 h-4 animate-spin text-navy flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <span className="text-xs font-semibold inter text-navy">
            Yüklənir...
          </span>
        </>
      ) : (
        <>
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
            />
          </svg>
          <p className="text-xs font-bold montserrat-700 tracking-wide leading-none">
            {focused ? "İndi Ctrl+V basın" : "Klikləyin → Ctrl+V"}
          </p>
          {focused && (
            <span className="text-[10px] font-bold tracking-widest uppercase montserrat px-1.5 py-0.5 rounded-full bg-gold text-navy ml-1">
              Hazır
            </span>
          )}
        </>
      )}
    </div>
  );
};

export default PasteImageZone;
