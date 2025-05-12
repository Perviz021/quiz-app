import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// 🔁 Utility to shuffle an array
const shuffleArray = (array) => array.sort(() => Math.random() - 0.5);

router.get("/questions/:subjectCode", authenticate, async (req, res) => {
  try {
    const { subjectCode } = req.params;
    const studentId = req.student.studentId;

    // 🔍 Check exam status
    const [examStatus] = await db.query(
      "SELECT submitted, submitted_at FROM results WHERE Tələbə_kodu = ? AND `Fənnin kodu` = ?",
      [studentId, subjectCode]
    );

    // If no exam record exists or exam is submitted
    if (examStatus.length === 0) {
      return res
        .status(404)
        .json({ error: "No active exam found. Please start the exam first." });
    }

    if (examStatus[0].submitted === 1) {
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

    // ✅ Fetch questions
    const [questions] = await db.query(
      "SELECT * FROM questions WHERE `fənnin_kodu` = ? AND lang = ? ORDER BY RAND() LIMIT 50",
      [subjectCode, language]
    );

    if (questions.length === 0) {
      return res
        .status(404)
        .json({ error: "No questions found for this subject." });
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
