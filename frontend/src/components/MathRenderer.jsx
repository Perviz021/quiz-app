/**
 * MathRenderer.jsx
 *
 * Renders a string that may contain LaTeX math alongside plain text.
 * Uses KaTeX loaded from CDN via a singleton promise — no build step needed.
 *
 * Supported delimiters:
 *   Inline:  $...$   or  \(...\)
 *   Display: $$...$$ or  \[...\]
 *
 * Usage:
 *   <MathRenderer text="Tapın: $\int_0^1 x^2\,dx$" />
 *   <MathRenderer text="\[\lim_{x\to 0}\frac{\sin x}{x}=1\]" block />
 *
 * Install KaTeX in your project:
 *   npm install katex
 * Then update the import at the bottom of this file from CDN to:
 *   import katex from 'katex';
 *   import 'katex/dist/katex.min.css';
 */

import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

// ── Parse text into segments: { type: "text"|"math", value, display } ──────
const parseSegments = (text) => {
  if (!text) return [];

  const segments = [];
  // Match $$...$$ | \[...\] | $...$ | \(...\)
  const pattern =
    /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^$\n]*?\$|\\\([^)]*?\\\))/g;

  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Plain text before this match
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        value: text.slice(lastIndex, match.index),
      });
    }

    const raw = match[0];
    const isDisplay = raw.startsWith("$$") || raw.startsWith("\\[");
    let formula = raw;

    if (raw.startsWith("$$")) formula = raw.slice(2, -2);
    else if (raw.startsWith("\\[")) formula = raw.slice(2, -2);
    else if (raw.startsWith("$")) formula = raw.slice(1, -1);
    else if (raw.startsWith("\\(")) formula = raw.slice(2, -2);

    segments.push({ type: "math", value: formula.trim(), display: isDisplay });
    lastIndex = match.index + raw.length;
  }

  // Remaining plain text
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments;
};

// ── Single math segment rendered by KaTeX ───────────────────────────────────
const MathSegment = ({ formula, display }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(formula, ref.current, {
        displayMode: display,
        throwOnError: false,
        output: "html",
      });
    } catch {
      if (ref.current) ref.current.textContent = formula;
    }
  }, [formula, display]);

  return (
    <span
      ref={ref}
      className={display ? "block my-2 text-center overflow-x-auto" : "inline"}
    />
  );
};

// ── Main exported component ──────────────────────────────────────────────────
const MathRenderer = ({ text, className = "" }) => {
  if (!text) return null;

  const segments = parseSegments(text);

  // If no math found, just render as HTML (existing behaviour for <br> tags)
  const hasMath = segments.some((s) => s.type === "math");
  if (!hasMath) {
    return (
      <span className={className} dangerouslySetInnerHTML={{ __html: text }} />
    );
  }

  return (
    <span className={`inline ${className}`}>
      {segments.map((seg, i) =>
        seg.type === "text" ? (
          <span key={i} dangerouslySetInnerHTML={{ __html: seg.value }} />
        ) : (
          <MathSegment key={i} formula={seg.value} display={seg.display} />
        ),
      )}
    </span>
  );
};

export default MathRenderer;
