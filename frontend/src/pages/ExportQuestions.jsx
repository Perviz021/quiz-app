import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PDFDownloadLink,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import API_BASE from "../config/api";
import { toast } from "react-toastify";

// Register a reliable font with Unicode support
Font.register({
  family: "DejaVuSans",
  src: "https://kendo.cdn.telerik.com/2017.2.621/styles/fonts/DejaVu/DejaVuSans.ttf",
});

// Create styles for PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 30,
    fontFamily: "DejaVuSans",
  },
  title: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
    fontFamily: "DejaVuSans",
  },
  question: {
    marginBottom: 15,
    fontFamily: "DejaVuSans",
  },
  questionText: {
    fontSize: 12,
    marginBottom: 8,
    fontFamily: "DejaVuSans",
  },
  option: {
    fontSize: 11,
    marginLeft: 20,
    marginBottom: 4,
    fontFamily: "DejaVuSans",
  },
  correctAnswer: {
    fontSize: 11,
    marginTop: 5,
    color: "#2563eb",
    fontFamily: "DejaVuSans",
  },
});

// Helper function to decode HTML entities and handle UTF-8
const decodeText = (text) => {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
};

// PDF Document component
const QuestionsPDF = ({ questions, subjectCode, subjectName }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>
        Fənn: {subjectName}({subjectCode}) - Suallar
      </Text>
      {questions.map((question, index) => (
        <View key={question.id} style={styles.question}>
          <Text style={styles.questionText}>
            {index + 1}. {decodeText(question.question)}
          </Text>
          {question.option1 && (
            <Text style={styles.option}>A) {decodeText(question.option1)}</Text>
          )}
          {question.option2 && (
            <Text style={styles.option}>B) {decodeText(question.option2)}</Text>
          )}
          {question.option3 && (
            <Text style={styles.option}>C) {decodeText(question.option3)}</Text>
          )}
          {question.option4 && (
            <Text style={styles.option}>D) {decodeText(question.option4)}</Text>
          )}
          {question.option5 && (
            <Text style={styles.option}>E) {decodeText(question.option5)}</Text>
          )}
          <Text style={styles.correctAnswer}>
            Düzgün cavab: {String.fromCharCode(64 + question.correct_option)}
          </Text>
        </View>
      ))}
    </Page>
  </Document>
);

const ExportQuestions = () => {
  const navigate = useNavigate();
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("az");

  const fetchQuestions = async () => {
    if (!subjectCode) {
      toast.error("Fənn kodunu daxil edin!");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/export-questions/${subjectCode}?lang=${language}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Sualları yükləmək mümkün olmadı");
      }

      const data = await response.json();
      if (data.length === 0) {
        toast.warning("Bu fənn üzrə sual tapılmadı!");
        return;
      }

      setQuestions(data);
      // Set the subject name from the first question
      if (data.length > 0) {
        setSubjectName(data[0].subject_name);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fieldInput =
    "w-full p-3 border border-border rounded-lg text-sm inter focus:ring-2 focus:ring-navy/25 focus:border-navy outline-none transition-all bg-slate-50 focus:bg-white";
  const fieldLabel =
    "block text-[11px] font-bold text-slate-500 uppercase tracking-wider montserrat mb-1.5";

  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-navy-mid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-gold-light text-[11px] font-semibold tracking-widest uppercase montserrat mb-1">
            Admin · Export
          </p>
          <h1 className="text-white text-2xl sm:text-3xl font-bold montserrat-700 leading-tight">
            Sualları{" "}
            <span className="text-gold-light">PDF formatında yüklə</span>
          </h1>
          <p className="text-slate-300 text-sm inter mt-1">
            Fənn kodu və dil seçin, sonra sualları gətirin və PDF və ya redaktə
            səhifəsinə keçin.
          </p>
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

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[160px]">
              <label className={fieldLabel}>Fənn kodu</label>
              <input
                type="text"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                placeholder="Məs: FEN001"
                className={fieldInput}
              />
            </div>
            <div className="w-full sm:w-40">
              <label className={fieldLabel}>Dil</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={`${fieldInput} cursor-pointer`}
              >
                <option value="az">Azərbaycan</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchQuestions}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 bg-navy hover:bg-navy-light text-white text-sm font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/40 focus:ring-offset-2 transition-colors duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed montserrat-700"
              >
                {loading ? "Yüklənir..." : "Sualları gətir"}
              </button>
            </div>
          </div>

          {questions && questions.length > 0 && (
            <div className="pt-6 border-t border-border flex flex-col sm:flex-row sm:flex-wrap gap-3">
              <PDFDownloadLink
                document={
                  <QuestionsPDF
                    questions={questions}
                    subjectCode={subjectCode}
                    subjectName={subjectName}
                  />
                }
                fileName={`${subjectCode} - ${subjectName}.pdf`}
                className="inline-flex justify-center items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-2 transition-colors duration-200 cursor-pointer montserrat-700"
              >
                {({ loading: pdfLoading }) =>
                  pdfLoading ? "PDF hazırlanır..." : "PDF-i yüklə"
                }
              </PDFDownloadLink>

              <button
                onClick={() =>
                  navigate(`/edit-questions/${subjectCode}/${language}`)
                }
                className="px-6 py-3 bg-white border-2 border-border text-navy font-bold rounded-lg hover:bg-slate-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:ring-offset-2 cursor-pointer montserrat-700"
              >
                Redaktə et
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportQuestions;
