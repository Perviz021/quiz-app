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
    let score = 0;
    const queries = [];

    for (const ans of answers) {
      const [result] = await db.query(
        "SELECT correct_option FROM questions WHERE id = ?",
        [ans.questionId]
      );

      if (result.length === 0) continue;

      console.log(
        `Question: ${ans.questionId}, Correct: ${result[0].correct_option}, Selected: ${ans.selectedOption}`
      );

      const isCorrect = result[0].correct_option == ans.selectedOption; // Ensure correct type comparison
      if (isCorrect) score++;

      queries.push(
        db.query(
          `INSERT INTO answers (Tələbə_kodu, \`Fənnin kodu\`, question_id, selected_option, is_correct)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE selected_option = VALUES(selected_option), is_correct = VALUES(is_correct)`,
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
      `INSERT INTO results (Tələbə_kodu, \`Fənnin kodu\`, score, total_questions, submitted_at)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE score = VALUES(score), total_questions = VALUES(total_questions), submitted_at = NOW()`,
      [studentId, subjectCode, score, answers.length]
    );

    res.json({ message: "Exam submitted successfully", score });
  } catch (error) {
    console.error("Error saving results:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
