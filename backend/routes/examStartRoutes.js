import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.post("/start", authenticate, async (req, res) => {
  const { studentId } = req.student;
  const { subjectCode } = req.body;

  // Only students can start exams
  if (req.student.status !== "student") {
    return res
      .status(403)
      .json({ error: "Bu əməliyyat yalnız tələbələr üçündür" });
  }

  try {
    // ── 1. Check for an already-active session ────────────────────────────
    // If the student already started this exam (results row exists and is not
    // submitted), just return the remaining time — no approval re-check needed.
    const [existing] = await db.query(
      `SELECT TIMESTAMPDIFF(SECOND, NOW(), created_at + INTERVAL 90 MINUTE + INTERVAL extra_time MINUTE) AS timeLeft,
              submitted
       FROM results
       WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
      [studentId, subjectCode],
    );

    // If there's an active session, return its time
    if (existing.length > 0 && existing[0].submitted === 0) {
      return res.json({ timeLeft: Math.max(0, existing[0].timeLeft) });
    }

    // Already submitted — do not allow restart
    if (existing.length > 0 && existing[0].submitted === 1) {
      return res.status(400).json({ error: "Exam already submitted." });
    }

    // ── 2. Check admin approval BEFORE creating the results row ───────────
    //
    // This is the critical gate. A student calling this endpoint directly
    // (via Postman, DevTools, curl) without admin approval gets a 403.
    // Without this check, anyone with a valid JWT could call /start and
    // then /questions to read all exam questions before the exam begins.
    //
    const [approvalRows] = await db.query(
      `SELECT status FROM exam_requests
       WHERE student_id = ? AND subject_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [studentId, subjectCode],
    );

    if (approvalRows.length === 0) {
      return res.status(403).json({
        error:
          "İmtahana başlamaq üçün admin icazəsi tələb olunur. Zəhmət olmasa sorğu göndərin.",
      });
    }

    if (approvalRows[0].status !== "approved") {
      return res.status(403).json({
        error:
          approvalRows[0].status === "pending"
            ? "İmtahan sorğunuz hələ təsdiqlənməyib. Adminin cavabını gözləyin."
            : "İmtahan sorğunuz rədd edilib. Adminlə əlaqə saxlayın.",
      });
    }

    // ── 3. Approval confirmed — start the exam ────────────────────────────
    await db.query(
      `INSERT INTO results (Tələbə_kodu, \`Fənnin kodu\`, created_at, submitted, extra_time)
       VALUES (?, ?, NOW(), 0, 0)`,
      [studentId, subjectCode],
    );

    res.json({ message: "Exam started", timeLeft: 5400 }); // 90 minutes
  } catch (error) {
    console.error("Error starting exam:", error);
    res.status(500).json({ error: "Failed to start exam" });
  }
});

export default router;
