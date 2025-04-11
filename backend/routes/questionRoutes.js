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

    // ✅ Fetch 10 random questions
    const [questions] = await db.query(
      "SELECT * FROM questions WHERE `fənnin_kodu` = ? ORDER BY RAND() LIMIT 10",
      [subjectCode]
    );

    const randomizedQuestions = questions.map((q) => {
      // 🧠 Prepare all options
      const options = [
        { text: q.option1, isCorrect: true },
        { text: q.option2, isCorrect: false },
        { text: q.option3, isCorrect: false },
        { text: q.option4, isCorrect: false },
        { text: q.option5, isCorrect: false },
      ];

      // 🔀 Shuffle options
      const shuffledOptions = shuffleArray(options);

      return {
        id: q.id,
        question: q.question.replace(/\n/g, "<br>"),
        options: shuffledOptions.map((opt) => opt.text),
        correctIndex: shuffledOptions.findIndex((opt) => opt.isCorrect),
      };
    });

    res.json(randomizedQuestions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
