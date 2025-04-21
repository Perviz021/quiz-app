import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.get("/active-students", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        s.\`Soyadı, adı və ata adı\` AS fullname,
        s.\`Tələbə_kodu\` AS id,
        sub.\`Fənnin adı\` AS subject,
        TIMESTAMPDIFF(MINUTE, NOW(), r.created_at + INTERVAL 1 HOUR) AS timeLeft
      FROM results r
      JOIN students s ON r.\`Tələbə_kodu\` = s.\`Tələbə_kodu\`
      JOIN subjects sub ON r.\`Fənnin kodu\` = sub.\`Fənnin kodu\`
      WHERE r.submitted = false
        AND NOW() < r.created_at + INTERVAL 1 HOUR
    `);

    res.json({ students: rows });
  } catch (err) {
    console.error("Error fetching active students:", err);
    res.status(500).json({ error: "Failed to fetch active students" });
  }
});

// 🚫 Stop a student's exam
router.post("/stop-exam", authenticate, async (req, res) => {
  const { studentId, subjectCode } = req.body;
  await db.query(
    `UPDATE results SET is_active = false WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
    [studentId, subjectCode]
  );
  res.json({ message: "Exam stopped for the student." });
});

// ⏳ Give extra time
router.post("/extend-time", authenticate, async (req, res) => {
  const { studentId, subjectCode, minutes } = req.body;
  await db.query(
    `UPDATE results SET extra_time = extra_time + ? WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
    [minutes, studentId, subjectCode]
  );
  res.json({ message: "Extra time granted." });
});

// ✅ Force submit
router.post("/force-submit", authenticate, async (req, res) => {
  const { studentId, subjectCode } = req.body;
  await db.query(
    `UPDATE results SET force_submit = true WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
    [studentId, subjectCode]
  );
  res.json({ message: "Exam marked for force submit." });
});

export default router;
