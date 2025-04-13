import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.post("/start", authenticate, async (req, res) => {
  const { studentId } = req.student;
  const { subjectCode } = req.body;

  console.log(req.body);

  try {
    // Prevent duplicate start entries
    const [existing] = await db.query(
      "SELECT id FROM results WHERE Tələbə_kodu = ? AND `Fənnin kodu` = ?",
      [studentId, subjectCode]
    );

    if (existing.length > 0) {
      return res
        .status(400)
        .json({ error: "Exam already started or submitted." });
    }

    await db.query(
      `INSERT INTO results (Tələbə_kodu, \`Fənnin kodu\`) VALUES (?, ?)`,
      [studentId, subjectCode]
    );

    res.json({ message: "Exam start time recorded" });
  } catch (error) {
    console.error("Error starting exam:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
