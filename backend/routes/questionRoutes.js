import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.get("/questions/:subjectCode", authenticate, async (req, res) => {
  try {
    const { subjectCode } = req.params;
    const [questions] = await db.query(
      "SELECT * FROM questions WHERE `fənnin_kodu` = ?",
      [subjectCode]
    );
    // res.json(questions);
    res.json(
      questions.map((q) => ({
        ...q,
        question: q.question.replace(/\n/g, "<br>"), // Replace \n with <br> for HTML
      }))
    );
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
