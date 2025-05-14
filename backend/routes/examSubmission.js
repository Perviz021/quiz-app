import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.post("/submit", authenticate, async (req, res) => {
  const studentId = req.student.studentId;
  const { subjectCode, answers } = req.body;

  if (!studentId || !subjectCode || !Array.isArray(answers)) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  // Get a connection from the pool
  const connection = await db.getConnection();

  try {
    // Begin transaction
    await connection.beginTransaction();

    try {
      // Check exam status
      const [examStatus] = await connection.query(
        `SELECT submitted, force_submit, force_submit_time,
                TIMESTAMPDIFF(SECOND, NOW(), created_at + INTERVAL 90 MINUTE + INTERVAL extra_time MINUTE) as timeLeft,
                TIMESTAMPDIFF(SECOND, force_submit_time, NOW()) as seconds_since_force
         FROM results 
         WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
        [studentId, subjectCode]
      );

      if (examStatus.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "No active exam session found" });
      }

      const exam = examStatus[0];

      // Check various submission conditions
      if (exam.submitted) {
        await connection.rollback();
        return res.status(403).json({ error: "Exam already submitted" });
      }

      // For normal submission, check if time is up
      if (!exam.force_submit && exam.timeLeft <= 0) {
        await connection.rollback();
        return res.status(403).json({ error: "Exam time has expired" });
      }

      // For force submit, check if within grace period (10 seconds)
      if (exam.force_submit && exam.seconds_since_force > 10) {
        await connection.rollback();
        return res
          .status(403)
          .json({ error: "Force submit grace period expired" });
      }

      // Calculate score
      let score = 0;
      const answerPromises = [];

      // Get all questions for scoring
      const [questions] = await connection.query(
        "SELECT id, correct_option FROM questions WHERE fənnin_kodu = ?",
        [subjectCode]
      );

      // Process each answer
      for (const answer of answers) {
        const question = questions.find((q) => q.id === answer.questionId);
        if (question) {
          const isCorrect = question.correct_option === answer.selectedOption;
          if (isCorrect) score++;

          answerPromises.push(
            connection.query(
              `INSERT INTO answers (Tələbə_kodu, \`Fənnin kodu\`, question_id, selected_option, is_correct)
               VALUES (?, ?, ?, ?, ?)`,
              [
                studentId,
                subjectCode,
                answer.questionId,
                answer.selectedOption,
                isCorrect,
              ]
            )
          );
        }
      }

      // Save all answers
      await Promise.all(answerPromises);

      // Update result
      await connection.query(
        `UPDATE results 
         SET submitted = true,
             submitted_at = NOW(),
             score = ?,
             total_questions = ?
         WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
        [score, questions.length, studentId, subjectCode]
      );

      // Commit transaction
      await connection.commit();

      res.json({
        message: "Exam submitted successfully",
        score,
        totalQuestions: questions.length,
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    }
  } catch (error) {
    console.error("Error submitting exam:", error);
    res.status(500).json({ error: "Failed to submit exam" });
  } finally {
    // Release the connection back to the pool
    connection.release();
  }
});

export default router;
