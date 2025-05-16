import { useState } from "react";
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
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchQuestions = async () => {
    if (!subjectCode) {
      toast.error("Fənn kodunu daxil edin!");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/export-questions/${subjectCode}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">
        Sualları PDF formatında yüklə
      </h2>

      <div className="bg-white rounded-xl shadow-md p-6 max-w-2xl mx-auto">
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            value={subjectCode}
            onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
            placeholder="Fənn kodunu daxil edin"
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={fetchQuestions}
            disabled={loading}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200 cursor-pointer"
          >
            {loading ? "Yüklənir..." : "Sualları gətir"}
          </button>
        </div>

        {questions && questions.length > 0 && (
          <div className="mt-6">
            <PDFDownloadLink
              document={
                <QuestionsPDF
                  questions={questions}
                  subjectCode={subjectCode}
                  subjectName={subjectName}
                />
              }
              fileName={`${subjectCode} - ${subjectName}.pdf`}
              className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 cursor-pointer"
            >
              {({ loading }) => (loading ? "PDF hazırlanır..." : "PDF-i yüklə")}
            </PDFDownloadLink>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportQuestions;
