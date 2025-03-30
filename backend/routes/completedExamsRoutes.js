import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.get("/completed-exams", authenticate, async (req, res) => {
  try {
    const studentId = req.student.studentId;

    // Fetch completed subjects for the student from the "results" table
    const [rows] = await db.execute(
      "SELECT DISTINCT `Fənnin kodu` FROM results WHERE `Tələbə_kodu` = ?",
      [studentId]
    );

    const completedExams = rows.map((row) => row["Fənnin kodu"]);

    res.json({ completedExams });
  } catch (error) {
    console.error("Error fetching completed exams:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
