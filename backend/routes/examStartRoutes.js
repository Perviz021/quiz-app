import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.post("/start", authenticate, async (req, res) => {
  const { studentId } = req.student;
  const { subjectCode } = req.body;

  try {
    // Check for active or submitted exam session
    const [existing] = await db.query(
      `SELECT TIMESTAMPDIFF(SECOND, NOW(), created_at + INTERVAL 90 MINUTE + INTERVAL extra_time MINUTE) AS timeLeft
       FROM results 
       WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ? AND submitted = false`,
      [studentId, subjectCode]
    );

    if (existing.length > 0) {
      return res.json({ timeLeft: Math.max(0, existing[0].timeLeft) });
    }

    // Check if exam was previously submitted
    const [submitted] = await db.query(
      `SELECT id FROM results 
       WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ? AND submitted = true`,
      [studentId, subjectCode]
    );

    if (submitted.length > 0) {
      return res.status(400).json({ error: "Exam already submitted." });
    }

    // Start new exam
    await db.query(
      `INSERT INTO results (Tələbə_kodu, \`Fənnin kodu\`, created_at, submitted, extra_time)
       VALUES (?, ?, NOW(), false, 0)`,
      [studentId, subjectCode]
    );

    res.json({ message: "Exam started", timeLeft: 5400 }); // 90 minutes
  } catch (error) {
    console.error("Error starting exam:", error);
    res.status(500).json({ error: "Failed to start exam" });
  }
});

export default router;
