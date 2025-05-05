import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.post("/start", authenticate, async (req, res) => {
  const { subjectCode } = req.body;
  const studentId = req.student.studentId;

  try {
    // Check if exam already started or submitted
    const [existing] = await db.query(
      `SELECT 1 FROM results 
       WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ? AND submitted = false`,
      [studentId, subjectCode]
    );

    if (existing.length > 0) {
      const [timer] = await db.query(
        `SELECT TIMESTAMPDIFF(SECOND, NOW(), created_at + INTERVAL 90 MINUTE + INTERVAL extra_time MINUTE) AS timeLeft
         FROM results WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
        [studentId, subjectCode]
      );
      return res.json({ timeLeft: Math.max(0, timer[0].timeLeft) });
    }

    // Start new exam
    await db.query(
      `INSERT INTO results (Tələbə_kodu, \`Fənnin kodu\`, created_at, submitted, extra_time, is_active)
       VALUES (?, ?, NOW(), false, 0, true)`,
      [studentId, subjectCode]
    );

    res.json({ timeLeft: 5400 }); // 90 minutes
  } catch (err) {
    console.error("Error starting exam:", err);
    res.status(500).json({ error: "Failed to start exam" });
  }
});

router.post("/submit", authenticate, async (req, res) => {
  const { studentId } = req.student;
  const { subjectCode, answers } = req.body;

  if (!studentId || !subjectCode || !Array.isArray(answers)) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  try {
    // Check if exam is still active
    const [result] = await db.query(
      `SELECT TIMESTAMPDIFF(SECOND, NOW(), created_at + INTERVAL 90 MINUTE + INTERVAL extra_time MINUTE) AS timeLeft
       FROM results WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ? AND submitted = false`,
      [studentId, subjectCode]
    );

    if (result.length === 0 || result[0].timeLeft <= 0) {
      return res
        .status(403)
        .json({ error: "Exam session expired or already submitted." });
    }

    let score = 0;
    const queries = [];

    for (const ans of answers) {
      const [result] = await db.query(
        "SELECT correct_option FROM questions WHERE id = ?",
        [ans.questionId]
      );

      if (result.length === 0) continue;

      const isCorrect = result[0].correct_option == ans.selectedOption;
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
