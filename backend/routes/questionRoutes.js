import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.get("/questions/:subjectCode", authenticate, async (req, res) => {
  try {
    const { subjectCode } = req.params;
    const studentId = req.student.studentId;

    // 🔍 Check if student has already taken the exam
    const [existingExam] = await db.query(
      "SELECT * FROM results WHERE Tələbə_kodu = ? AND `Fənnin kodu` = ?",
      [studentId, subjectCode]
    );

    if (existingExam.length > 0) {
      return res
        .status(403)
        .json({ error: "You have already taken this exam." });
    }

    // Get the language for this subject from FTP table
    const [subjectInfo] = await db.query(
      "SELECT lang FROM FTP WHERE Tələbə_kodu = ? AND `Fənnin kodu` = ?",
      [studentId, subjectCode]
    );

    if (subjectInfo.length === 0) {
      return res
        .status(404)
        .json({ error: "Subject not found for this student." });
    }

    const language = subjectInfo[0].lang;

    // ✅ Fetch questions with language filter
    const [questions] = await db.query(
      "SELECT * FROM questions WHERE `fənnin_kodu` = ? AND lang = ? ORDER BY RAND() LIMIT 50",
      [subjectCode, language]
    );

    if (questions.length === 0) {
      return res
        .status(404)
        .json({ error: "No questions found for this subject and language." });
    }

    res.json(
      questions.map((q) => ({
        id: q.id,
        question: q.question.replace(/\n/g, "<br>"),
        option1: q.option1,
        option2: q.option2,
        option3: q.option3,
        option4: q.option4,
        option5: q.option5,
        correctOption: q.correct_option,
      }))
    );
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
