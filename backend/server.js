import express from "express";
import mysql from "mysql2";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

// ✅ Fetch all subjects
app.get("/subjects", (req, res) => {
  db.query("SELECT * FROM subjects", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// ✅ Fetch questions for a subject
app.get("/questions/:subjectId", (req, res) => {
  const { subjectId } = req.params;
  db.query(
    "SELECT * FROM questions WHERE subject_id = ?",
    [subjectId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

// ✅ Submit exam results
app.post("/submit", async (req, res) => {
  try {
    const { studentName, subjectId, answers } = req.body;
    if (!studentName || !subjectId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let correctCount = 0;
    const totalQuestions = answers.length;

    await Promise.all(
      answers.map(async ({ questionId, selectedOption }) => {
        return new Promise((resolve, reject) => {
          db.query(
            "SELECT correct_option FROM questions WHERE id = ?",
            [questionId],
            (err, result) => {
              if (err) return reject(err);
              if (result.length === 0) return reject("Question not found");

              const isCorrect = result[0].correct_option === selectedOption;
              if (isCorrect) correctCount++;

              db.query(
                "INSERT INTO answers (student_name, subject_id, question_id, selected_option, is_correct) VALUES (?, ?, ?, ?, ?)",
                [studentName, subjectId, questionId, selectedOption, isCorrect],
                (err) => {
                  if (err) return reject(err);
                  resolve();
                }
              );
            }
          );
        });
      })
    );

    db.query(
      "INSERT INTO results (student_name, subject_id, score, total_questions) VALUES (?, ?, ?, ?)",
      [studentName, subjectId, correctCount, totalQuestions],
      (err) => {
        if (err) return res.status(500).json(err);
        res.json({
          message: "Exam submitted!",
          score: correctCount,
          totalQuestions,
        });
      }
    );
  } catch (error) {
    console.error("Error submitting exam:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
