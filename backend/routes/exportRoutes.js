import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Get all questions for a subject (admin or teacher)
router.get("/export-questions/:subjectCode", authenticate, async (req, res) => {
  try {
    // Check if user is admin or teacher
    if (req.student.status !== "staff" && req.student.status !== "teacher") {
      return res.status(403).json({
        error: "Bu səhifəyə yalnız admin və ya müəllimlər daxil ola bilər",
      });
    }

    const { subjectCode } = req.params;
    const { lang = "az" } = req.query; // Default to 'az' if not specified

    // If user is teacher, verify they teach this subject
    if (req.student.status === "teacher") {
      console.log("Checking teacher permissions for:", {
        teacherId: req.student.studentId,
        teacherName: req.student.fullname,
        subjectCode: subjectCode,
      });

      // First check if the subject exists
      const [subjectExists] = await db.query(
        "SELECT `Fənnin kodu` FROM subjects WHERE `Fənnin kodu` = ?",
        [subjectCode]
      );

      if (subjectExists.length === 0) {
        return res.status(404).json({ error: "Fənn tapılmadı" });
      }

      // Then check if the teacher is assigned to this subject
      const [teacherSubjects] = await db.query(
        `SELECT DISTINCT s.\`Fənnin kodu\`
         FROM subjects s
         JOIN ftp f ON f.\`Fənnin kodu\` = s.\`Fənnin kodu\`
         WHERE (f.\`teacher_code\` = ? OR f.\`Professor\` = ?)
         AND s.\`Fənnin kodu\` = ?`,
        [req.student.studentId, req.student.fullname, subjectCode]
      );

      console.log("Teacher subjects found:", teacherSubjects);

      if (teacherSubjects.length === 0) {
        return res.status(403).json({
          error: "Bu fənn üzrə sualları görmək üçün icazəniz yoxdur",
          details: {
            teacherId: req.student.studentId,
            teacherName: req.student.fullname,
            subjectCode: subjectCode,
          },
        });
      }
    }

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
