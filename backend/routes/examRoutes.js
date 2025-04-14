import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.post("/submit", authenticate, async (req, res) => {
  const { studentId } = req.student;
  const { subjectCode, answers } = req.body;

  if (!studentId || !subjectCode || !Array.isArray(answers)) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  try {
    // 🔍 Check if the student has already taken this exam
    const [existingResult] = await db.query(
      "SELECT id FROM results WHERE Tələbə_kodu = ? AND `Fənnin kodu` = ? AND submitted = true",
      [studentId, subjectCode]
    );

    if (existingResult.length > 0) {
      return res
        .status(403)
        .json({ error: "You have already taken this exam." });
    }

    let score = 0;
    const queries = [];

    for (const ans of answers) {
      const [result] = await db.query(
        "SELECT correct_option FROM questions WHERE id = ?",
        [ans.questionId]
      );

      if (result.length === 0) continue;

      const isCorrect = result[0].correct_option == ans.selectedOption+1;
      if (isCorrect) score++;

      queries.push(
        db.query(
          `INSERT INTO answers (Tələbə_kodu, \`Fənnin kodu\`, question_id, selected_option, is_correct)
           VALUES (?, ?, ?, ?, ?)`,
          [
            studentId,
            subjectCode,
            ans.questionId,
            ans.selectedOption,
            isCorrect,
          ]
        )
      );
    }

    await Promise.all(queries);

    await db.query(
      `UPDATE results SET score = ?, total_questions = ?, submitted = true, submitted_at = NOW()
       WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
      [score, answers.length, studentId, subjectCode]
    );

    res.json({ message: "Exam submitted successfully", score });
  } catch (error) {
    console.error("Error saving results:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
