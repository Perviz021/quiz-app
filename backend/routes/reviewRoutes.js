import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.get("/review/:subjectCode", authenticate, async (req, res) => {
  const studentId = req.student.studentId; // From JWT middleware
  const { subjectCode } = req.params;

  try {
    const [review] = await db.query(
      `
      SELECT 
        q.id AS questionId,
        q.question,
        q.question_image,
        q.option1,
        q.option1_image,
        q.option2,
        q.option2_image,
        q.option3,
        q.option3_image,
        q.option4,
        q.option4_image,
        q.option5,
        q.option5_image,
        q.correct_option,
        a.selected_option
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      WHERE a.\`Tələbə_kodu\` = ? AND a.\`Fənnin kodu\` = ?
    `,
      [studentId, subjectCode],
    );

    res.json(review);
  } catch (error) {
    console.error("Error fetching review data:", error);
    res.status(500).json({ error: "Failed to fetch review data" });
  }
});

export default router;
