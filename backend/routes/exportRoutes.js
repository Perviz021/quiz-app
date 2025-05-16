import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Get all questions for a subject (admin only)
router.get("/export-questions/:subjectCode", authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.student.status !== "staff") {
      return res
        .status(403)
        .json({ error: "Bu səhifəyə yalnız adminlər daxil ola bilər" });
    }

    const { subjectCode } = req.params;
    const { lang = "az" } = req.query; // Default to 'az' if not specified

    // Set response headers for UTF-8
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    // Fetch all questions for the subject and specified language
    const [questions] = await db.query(
      "SELECT q.*, sub.`Fənnin adı` as subject_name FROM questions q JOIN subjects sub ON sub.`Fənnin kodu` = q.fənnin_kodu WHERE q.`fənnin_kodu` = ? AND q.lang = ? ORDER BY id ASC;",
      [subjectCode, lang]
    );

    res.json(questions);
  } catch (error) {
    console.error("Error exporting questions:", error);
    res.status(500).json({ error: "Sualları yükləmək mümkün olmadı" });
  }
});

export default router;
