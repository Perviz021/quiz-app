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
        r.extra_time AS bonusTime,
        CONCAT(s.\`Tələbə_kodu\`, '_', sub.\`Fənnin kodu\`) AS roomId,
        TIMESTAMPDIFF(SECOND, NOW(), r.created_at + INTERVAL 90 MINUTE + INTERVAL r.extra_time MINUTE) AS timeLeft
      FROM results r
      JOIN students s ON r.\`Tələbə_kodu\` = s.\`Tələbə_kodu\`
      JOIN subjects sub ON r.\`Fənnin kodu\` = sub.\`Fənnin kodu\`
      WHERE r.submitted = false
        AND NOW() < r.created_at + INTERVAL 90 MINUTE + INTERVAL r.extra_time MINUTE
    `);

    const students = rows.map((row) => ({
      ...row,
      timeLeft: Math.max(0, row.timeLeft),
    }));

    res.json({ students });
  } catch (err) {
    console.error("Error fetching active students:", err);
    res.status(500).json({ error: "Failed to fetch active students" });
  }
});

router.get("/exam-time/:subjectCode", authenticate, async (req, res) => {
  const { subjectCode } = req.params;
  const studentId = req.student.studentId;

  if (!subjectCode.match(/^[A-Za-z0-9]+$/)) {
    return res.status(400).json({ error: "Invalid subject code" });
  }

  try {
    const [rows] = await db.query(
      `SELECT TIMESTAMPDIFF(SECOND, NOW(), created_at + INTERVAL 90 MINUTE + INTERVAL extra_time MINUTE) AS timeLeft
       FROM results 
       WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ? AND submitted = false`,
      [studentId, subjectCode]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "No active exam session found" });
    }

    res.json({ timeLeft: Math.max(0, rows[0].timeLeft) });
  } catch (err) {
    console.error("Error fetching exam time:", err);
    res.status(500).json({ error: "Failed to fetch exam time" });
  }
});

// 🚫 Stop a student's exam
router.post("/stop-exam", authenticate, async (req, res) => {
  const { studentId, subjectCode } = req.body;

  if (!studentId.match(/^\d{8}$/) || !subjectCode.match(/^[A-Za-z0-9]+$/)) {
    return res
      .status(400)
      .json({ error: "Invalid student ID or subject code" });
  }

  try {
    const [rows] = await db.query(
      `SELECT id FROM results 
       WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ? AND submitted = false`,
      [studentId, subjectCode]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "No active exam session found" });
    }

    await db.query(
      `UPDATE results SET submitted = true, submitted_at = NOW() 
       WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
      [studentId, subjectCode]
    );

    const io = getIO();
    io.to(studentId).emit("exam_stopped");

    res.json({ message: "Exam stopped for the student." });
  } catch (err) {
    console.error("Error stopping exam:", err);
    res.status(500).json({ error: "Failed to stop exam" });
  }
});

// ⏳ Give extra time
router.post("/extend-time", authenticate, async (req, res) => {
  const { studentId, subjectCode, minutes } = req.body;

  if (
    !studentId.match(/^\d{8}$/) ||
    !subjectCode.match(/^[A-Za-z0-9]+$/) ||
    !Number.isInteger(minutes) ||
    minutes <= 0
  ) {
    return res
      .status(400)
      .json({ error: "Invalid student ID, subject code, or minutes" });
  }

  try {
    const [rows] = await db.query(
      `SELECT id FROM results 
       WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ? AND submitted = false`,
      [studentId, subjectCode]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "No active exam session found" });
    }

    await db.query(
      `UPDATE results SET extra_time = extra_time + ? 
       WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
      [minutes, studentId, subjectCode]
    );

    const io = getIO();
    const roomId = `${studentId}_${subjectCode}`;
    io.to(roomId).emit("extend_time", minutes);

    res.json({ message: "Extra time granted and socket notified." });
  } catch (err) {
    console.error("Error extending time:", err);
    res.status(500).json({ error: "Failed to grant extra time" });
  }
});

// Force submit exam
router.post("/force-submit", authenticate, async (req, res) => {
  const { studentId, subjectCode } = req.body;

  if (!studentId.match(/^\d{8}$/) || !subjectCode.match(/^[A-Za-z0-9]+$/)) {
    return res
      .status(400)
      .json({ error: "Invalid student ID or subject code" });
  }

  try {
    const [rows] = await db.query(
      `SELECT id FROM results 
       WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ? AND submitted = false`,
      [studentId, subjectCode]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "No active exam session found" });
    }

    await db.query(
      `UPDATE results SET submitted = true, submitted_at = NOW() 
       WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
      [studentId, subjectCode]
    );

    const io = getIO();
    const roomId = `${studentId}_${subjectCode}`;
    io.to(roomId).emit("exam_stopped");
    io.to(roomId).emit("force_submit");

    res.json({ message: `Exam force submitted for student ${studentId}` });
  } catch (err) {
    console.error("Error force submitting exam:", err);
    res.status(500).json({ error: "Failed to force submit exam" });
  }
});

export default router;
