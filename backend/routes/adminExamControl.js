import express from "express";
import db from "../db.js";
import { adminAuthenticate } from "../middleware/adminAuth.js"; // You should verify admin access

const router = express.Router();

// 🚫 Stop a student's exam
router.post("/stop-exam", adminAuthenticate, async (req, res) => {
  const { studentId, subjectCode } = req.body;
  await db.query(
    `UPDATE results SET is_active = false WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
    [studentId, subjectCode]
  );
  res.json({ message: "Exam stopped for the student." });
});

// ⏳ Give extra time
router.post("/extend-time", adminAuthenticate, async (req, res) => {
  const { studentId, subjectCode, minutes } = req.body;
  await db.query(
    `UPDATE results SET extra_time = extra_time + ? WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
    [minutes, studentId, subjectCode]
  );
  res.json({ message: "Extra time granted." });
});

// ✅ Force submit
router.post("/force-submit", adminAuthenticate, async (req, res) => {
  const { studentId, subjectCode } = req.body;
  await db.query(
    `UPDATE results SET force_submit = true WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
    [studentId, subjectCode]
  );
  res.json({ message: "Exam marked for force submit." });
});

export default router;
