import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.post("/submit", authenticate, async (req, res) => {
  const studentId = req.student.studentId;
  const { subjectCode, answers, leftPage } = req.body;

  if (!studentId || !subjectCode || !Array.isArray(answers)) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  // Get a connection from the pool
  const connection = await db.getConnection();

  try {
    // Begin transaction
    await connection.beginTransaction();

    try {
      // Check exam status (fetch option_order for shuffle-aware scoring)
      const [examStatus] = await connection.query(
        `SELECT submitted, force_submit, force_submit_time, option_order,
                TIMESTAMPDIFF(SECOND, NOW(), created_at + INTERVAL 90 MINUTE + INTERVAL extra_time MINUTE) as timeLeft,
                TIMESTAMPDIFF(SECOND, force_submit_time, NOW()) as seconds_since_force
         FROM results 
         WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
        [studentId, subjectCode],
      );

      if (examStatus.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "Aktiv imtahan tapılmadı" });
      }

      const exam = examStatus[0];

      // Already submitted → reject
      if (exam.submitted) {
        await connection.rollback();
        return res.status(403).json({ error: "Imtahan artıq bitmişdir" });
      }

      // ── Time check with grace period ──────────────────────────────────────
      //
      // WHY THE GRACE PERIOD:
      // The frontend countdown reaches 0 and immediately fires the fetch.
      // By the time the request arrives at the server, the DB timestamp
      // calculation also shows timeLeft <= 0 — which was previously causing
      // a 403 rejection and the student getting 0 because the backend
      // refused to save their answers.
      //
      // We allow a 30-second grace window so the auto-submit always succeeds.
      // Admins can still force-submit at any time; that path is unchanged.
      //
      const GRACE_SECONDS = 30;
      const isOvertime =
        exam.timeLeft !== null && exam.timeLeft < -GRACE_SECONDS;

      if (!exam.force_submit && isOvertime) {
        await connection.rollback();
        return res.status(403).json({ error: "Imtahan vaxtı bitmişdir" });
      }

      // For force submit, check if within grace period (10 seconds)
      if (exam.force_submit && exam.seconds_since_force > 10) {
        await connection.rollback();
        return res
          .status(403)
          .json({ error: "Force submit grace period expired" });
      }

      // ── Parse stored shuffle map ──────────────────────────────────────────
      // option_order: { "questionId": { correct: shuffledSlot, map: {...} } }
      // We score against shuffledCorrect — the slot the student actually saw.
      let optionOrderMap = {};
      if (exam.option_order) {
        try {
          optionOrderMap =
            typeof exam.option_order === "string"
              ? JSON.parse(exam.option_order)
              : exam.option_order;
        } catch {
          optionOrderMap = {};
        }
      }

      // Calculate score
      let score = 0;
      const answerPromises = [];

      // Fetch original correct_option as fallback for questions with no stored map
      const [questions] = await connection.query(
        "SELECT id, correct_option FROM questions WHERE fənnin_kodu = ?",
        [subjectCode],
      );
      const dbCorrectMap = {};
      questions.forEach((q) => {
        dbCorrectMap[q.id] = q.correct_option;
      });

      // Process each answer
      for (const answer of answers) {
        const qid = answer.questionId;

        // Use the shuffled correct slot if available, otherwise fall back to DB value
        const stored = optionOrderMap[qid];
        const correctSlot = stored
          ? stored.correct
          : (dbCorrectMap[qid] ?? null);

        if (correctSlot === null) continue;

        const isCorrect = correctSlot === answer.selectedOption;
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
            ],
          ),
        );
      }

      // Save all answers
      await Promise.all(answerPromises);

      // Update result
      await connection.query(
        `UPDATE results 
         SET submitted = true,
             submitted_at = NOW(),
             score = ?,
             total_questions = ?,
             left_page = ?
         WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
        [score, questions.length, leftPage || false, studentId, subjectCode],
      );

      // Commit transaction
      await connection.commit();

      res.json({
        message: "Imtahan uğurla göndərildi",
        score,
        totalQuestions: questions.length,
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    }
  } catch (error) {
    console.error("Error submitting exam:", error);
    res.status(500).json({ error: "Imtahan göndərmə baş tutmadı" });
  } finally {
    // Release the connection back to the pool
    connection.release();
  }
});

router.get("/pre-exam/:subjectCode", authenticate, async (req, res) => {
  const { subjectCode } = req.params;
  const studentId = req.student.studentId;

  try {
    const [rows] = await db.query(
      `SELECT \`Pre-Exam\` as preExam 
       FROM ftp 
       WHERE \`Tələbə_kodu\` = ? AND \`Fənnin kodu\` = ?`,
      [studentId, subjectCode],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Pre-exam balı tapılmadı" });
    }

    res.json({ preExam: rows[0].preExam });
  } catch (error) {
    console.error("Error fetching pre-exam score:", error);
    res.status(500).json({ error: "Pre-exam balını almaq baş tutmadı" });
  }
});

export default router;
