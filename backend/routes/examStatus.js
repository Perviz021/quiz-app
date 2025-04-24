import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.post("/check-exam-status", authenticate, async (req, res) => {
  const { studentId, subjectCode } = req.body;

  const [rows] = await db.query(
    `SELECT submitted FROM results WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
    [studentId, subjectCode]
  );

  if (rows.length === 0) {
    return res.json({ active: false });
  }

  const isActive = rows[0].submitted === 0;

  res.json({ active: isActive });
});

export default router;
