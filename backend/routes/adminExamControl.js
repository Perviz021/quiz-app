import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";
import { getIO } from "../socket/ioInstance.js";

const router = express.Router();

router.get("/active-students", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        s.\`Soyadı, adı və ata adı\` AS fullname,
        s.\`Tələbə_kodu\` AS id,
        sub.\`Fənnin adı\` AS subject,
        sub.\`Fənnin kodu\` AS subjectCode,
        r.extra_time as bonusTime,
        TIMESTAMPDIFF(MINUTE, NOW(), r.created_at + INTERVAL 90 MINUTE + INTERVAL r.extra_time MINUTE) AS timeLeft
      FROM results r
      JOIN students s ON r.\`Tələbə_kodu\` = s.\`Tələbə_kodu\`
      JOIN subjects sub ON r.\`Fənnin kodu\` = sub.\`Fənnin kodu\`
      WHERE r.submitted = false
        AND NOW() < r.created_at + INTERVAL 90 MINUTE + INTERVAL r.extra_time MINUTE
    `);

    res.json({ students: rows });
  } catch (err) {
    console.error("Error fetching active students:", err);
    res.status(500).json({ error: "Failed to fetch active students" });
  }
});

// 🚫 Stop a student's exam
router.post("/stop-exam", async (req, res) => {
  const { studentId, subjectCode } = req.body;
  await db.query(
    `UPDATE results SET is_active = false WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
    [studentId, subjectCode]
  );
  res.json({ message: "Exam stopped for the student." });
});

// ⏳ Give extra time
router.post("/extend-time", async (req, res) => {
  const { studentId, subjectCode, minutes } = req.body;

  try {
    // Update database
    await db.query(
      `UPDATE results SET extra_time = extra_time + ? WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
      [minutes, studentId, subjectCode]
    );

    // Emit socket event to the student's room
    const io = getIO();
    io.to(studentId).emit("extend_time", minutes);

    res.json({ message: "Extra time granted and socket notified." });
  } catch (err) {
    console.error("Error extending time:", err);
    res.status(500).json({ error: "Failed to grant extra time" });
  }
});

export const forceSubmitExam = (req, res) => {
  const { studentId } = req.body;

  const io = getIO(); // get socket instance
  io.to(studentId).emit("force_submit"); // send event to the student room

  res
    .status(200)
    .json({ message: `Exam force submitted for student ${studentId}` });
};

router.post("/force-submit", forceSubmitExam);

export default router;
