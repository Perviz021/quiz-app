import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.get("/questions/:subjectCode", authenticate, async (req, res) => {
  try {
    // console.log("req params: ", req.params);
    // console.log("req student: ", req.student);
    // console.log("------------");

    const { subjectCode } = req.params;
    const studentId = req.student.studentId; // Extract from authentication

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

    // ✅ Fetch 5 random questions if exam is not taken
    const [questions] = await db.query(
      "SELECT * FROM questions WHERE `fənnin_kodu` = ? ORDER BY RAND() LIMIT 10",
      [subjectCode]
    );

    // res.json(questions);
    res.json(
      questions.map((q) => ({
        ...q,
        question: q.question.replace(/\n/g, "<br>"), // Replace \n with <br> for HTML
      }))
    );
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
