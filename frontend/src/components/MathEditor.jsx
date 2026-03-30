/**
 * MathEditor.jsx
 *
 * A textarea with:
 *  - A collapsible formula toolbar (grouped by category)
 *  - Live KaTeX preview below the textarea
 *  - Clicking a toolbar button inserts the snippet at the cursor
 *
 * Props:
 *   value        string   — current text value
 *   onChange     fn(val)  — called on every keystroke
 *   rows         number   — textarea rows (default 3)
 *   placeholder  string
 *   id           string   — for label htmlFor
 */

import { useState, useRef, useEffect } from "react";
import MathRenderer from "./MathRenderer";

// ── Formula snippets grouped by category ────────────────────────────────────
const FORMULA_GROUPS = [
  {
    label: "Kəsr / Kök",
    items: [
      { label: "a/b", snippet: "\\frac{a}{b}", title: "Kəsr" },
      { label: "√x", snippet: "\\sqrt{x}", title: "Kvadrat kök" },
      { label: "ⁿ√x", snippet: "\\sqrt[n]{x}", title: "n-ci dərəcəli kök" },
      { label: "xⁿ", snippet: "x^{n}", title: "Üst (qüvvət)" },
      { label: "xₙ", snippet: "x_{n}", title: "Alt indeks" },
    ],
  },
  {
    label: "Limit / Cəm / Hasilə",
    items: [
      { label: "lim", snippet: "\\lim_{x \\to a}", title: "Limit" },
      { label: "∑", snippet: "\\sum_{i=1}^{n}", title: "Cəm (sigma)" },
      { label: "∏", snippet: "\\prod_{i=1}^{n}", title: "Hasilə (pi)" },
      { label: "∞", snippet: "\\infty", title: "Sonsuzluq" },
    ],
  },
  {
    label: "İntegral / Törəmə",
    items: [
      { label: "∫", snippet: "\\int_{a}^{b}", title: "İntegral" },
      { label: "∬", snippet: "\\iint", title: "İkiqat integral" },
      { label: "∮", snippet: "\\oint", title: "Kontur integrali" },
      { label: "f′", snippet: "f'(x)", title: "Törəmə (ştrix)" },
      { label: "df/dx", snippet: "\\frac{d}{dx}", title: "Törəmə (kəsr)" },
      {
        label: "∂f/∂x",
        snippet: "\\frac{\\partial f}{\\partial x}",
        title: "Qismən törəmə",
      },
    ],
  },
  {
    label: "Loqarifm / Triqonometriya",
    items: [
      { label: "log", snippet: "\\log_{a}(x)", title: "Loqarifm" },
      { label: "ln", snippet: "\\ln(x)", title: "Natural loqarifm" },
      { label: "sin", snippet: "\\sin(x)", title: "Sinus" },
      { label: "cos", snippet: "\\cos(x)", title: "Kosinus" },
      { label: "tan", snippet: "\\tan(x)", title: "Tangens" },
      { label: "arcsin", snippet: "\\arcsin(x)", title: "Arksin" },
    ],
  },
  {
    label: "Matris / Binom",
    items: [
      {
        label: "2×2",
        snippet: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}",
        title: "2×2 matris",
      },
      { label: "Cₙᵏ", snippet: "\\binom{n}{k}", title: "Binom əmsalı" },
      { label: "|x|", snippet: "\\left|x\\right|", title: "Modul" },
      { label: "‖x‖", snippet: "\\left\\|x\\right\\|", title: "Norma" },
    ],
  },
  {
    label: "Çoxluqlar / Məntiq",
    items: [
      { label: "∈", snippet: "\\in", title: "Mənsubiyyət" },
      { label: "∉", snippet: "\\notin", title: "Qeyri-mənsubiyyət" },
      { label: "⊂", snippet: "\\subset", title: "Alt çoxluq" },
      { label: "∪", snippet: "\\cup", title: "Birləşmə" },
      { label: "∩", snippet: "\\cap", title: "Kəsişmə" },
      { label: "∅", snippet: "\\emptyset", title: "Boş çoxluq" },
      { label: "∀", snippet: "\\forall", title: "Hər" },
      { label: "∃", snippet: "\\exists", title: "Mövcuddur" },
    ],
  },
  {
    label: "Müqayisə / Oxlar",
    items: [
      { label: "≠", snippet: "\\neq", title: "Bərabər deyil" },
      { label: "≤", snippet: "\\leq", title: "Kiçik ya bərabər" },
      { label: "≥", snippet: "\\geq", title: "Böyük ya bərabər" },
      { label: "≈", snippet: "\\approx", title: "Təxmini bərabər" },
      { label: "→", snippet: "\\to", title: "Ox (tərəf)" },
      { label: "⇒", snippet: "\\Rightarrow", title: "İmplikasiya" },
      { label: "⟺", snippet: "\\Leftrightarrow", title: "Ekvivalentlik" },
    ],
  },
  {
    label: "Yunan hərfləri",
    items: [
      { label: "α", snippet: "\\alpha", title: "Alfa" },
      { label: "β", snippet: "\\beta", title: "Beta" },
      { label: "γ", snippet: "\\gamma", title: "Qamma" },
      { label: "δ", snippet: "\\delta", title: "Delta" },
      { label: "ε", snippet: "\\epsilon", title: "Epsilon" },
      { label: "θ", snippet: "\\theta", title: "Teta" },
      { label: "λ", snippet: "\\lambda", title: "Lambda" },
      { label: "μ", snippet: "\\mu", title: "Mü" },
      { label: "π", snippet: "\\pi", title: "Pi" },
      { label: "σ", snippet: "\\sigma", title: "Siqma" },
      { label: "φ", snippet: "\\phi", title: "Fi" },
      { label: "ω", snippet: "\\omega", title: "Omeqa" },
    ],
  },
];

// ── Toolbar button ───────────────────────────────────────────────────────────
const ToolbarBtn = ({ item, onInsert }) => (
  <button
    type="button"
    title={item.title}
    onClick={() => onInsert(item.snippet)}
    className="px-2 py-1 text-xs font-mono bg-navy/5 hover:bg-navy text-navy hover:text-white border border-navy/15 rounded transition-colors duration-150 cursor-pointer whitespace-nowrap"
  >
    {item.label}
  </button>
);

// ── Main component ───────────────────────────────────────────────────────────
const MathEditor = ({
  value = "",
  onChange,
  rows = 3,
  placeholder = "Mətni daxil edin. Düstur üçün $...$ (inline) və ya $$...$$ (blok) istifadə edin.",
  id,
}) => {
  const textareaRef = useRef(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [openGroup, setOpenGroup] = useState(null); // which category is expanded

  // Insert snippet at cursor position
  const insertSnippet = (snippet) => {
    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    // Wrap in inline math delimiters
    const insert = `$${snippet}$`;
    const next = value.slice(0, start) + insert + value.slice(end);
    onChange(next);

    // Restore cursor inside the snippet
    requestAnimationFrame(() => {
      ta.focus();
      const cur = start + insert.length;
      ta.setSelectionRange(cur, cur);
    });
  };

  return (
    <div className="space-y-2">
      {/* Toolbar toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowToolbar((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-navy montserrat-700 uppercase tracking-wider px-2.5 py-1 rounded-lg border border-navy/20 hover:bg-navy/5 transition-colors cursor-pointer"
        >
          <span className="text-base leading-none">∑</span>
          {showToolbar ? "Düstur paneli gizlət" : "Düstur paneli aç"}
        </button>
        <span className="text-[11px] text-slate-400 inter">
          Düstur:{" "}
          <code className="bg-slate-100 px-1 rounded text-navy font-mono">
            $...$
          </code>{" "}
          &nbsp;|&nbsp; Blok:{" "}
          <code className="bg-slate-100 px-1 rounded text-navy font-mono">
            $$...$$
          </code>
        </span>
      </div>

      {/* Collapsible toolbar */}
      {showToolbar && (
        <div className="rounded-xl border border-navy/15 bg-slate-50 overflow-hidden">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-1 p-2 border-b border-navy/10 bg-white">
            {FORMULA_GROUPS.map((group) => (
              <button
                key={group.label}
                type="button"
                onClick={() =>
                  setOpenGroup(openGroup === group.label ? null : group.label)
                }
                className={`text-[11px] font-semibold montserrat-600 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  openGroup === group.label
                    ? "bg-navy text-white"
                    : "text-slate-600 hover:bg-navy/10 hover:text-navy"
                }`}
              >
                {group.label}
              </button>
            ))}
          </div>

          {/* Expanded group buttons */}
          {openGroup && (
            <div className="p-2 flex flex-wrap gap-1.5">
              {FORMULA_GROUPS.find((g) => g.label === openGroup)?.items.map(
                (item) => (
                  <ToolbarBtn
                    key={item.snippet}
                    item={item}
                    onInsert={insertSnippet}
                  />
                ),
              )}
            </div>
          )}
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2.5 border border-border rounded-lg text-sm font-mono inter focus:ring-2 focus:ring-navy/25 focus:border-navy outline-none transition-all bg-slate-50 focus:bg-white resize-y"
      />

      {/* Live preview — only show when text contains $ */}
      {value && value.includes("$") && (
        <div className="rounded-lg border border-gold/30 bg-gold-pale/30 px-4 py-3">
          <p className="text-[10px] font-bold text-slate-400 montserrat uppercase tracking-wider mb-2">
            Önbaxış
          </p>
          <div className="text-sm text-slate-800 inter leading-relaxed">
            <MathRenderer text={value} />
          </div>
        </div>
      )}
    </div>
  );
};

export default MathEditor;
