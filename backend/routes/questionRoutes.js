import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// 🔁 Utility to shuffle an array
const shuffleArray = (array) => array.sort(() => Math.random() - 0.5);

router.get("/questions/:subjectCode/:lang", authenticate, async (req, res) => {
  try {
    const { subjectCode, lang } = req.params;
    const { questionIds } = req.query;
    const studentId = req.student.studentId;

    console.log(
      `Fetching questions for student ${studentId}, subject ${subjectCode}`
    );

    // 🔍 Check exam status
    const [examStatus] = await db.query(
      "SELECT submitted, submitted_at FROM results WHERE Tələbə_kodu = ? AND `Fənnin kodu` = ?",
      [studentId, subjectCode]
    );

    console.log("Exam status:", examStatus);

    // If no exam record exists or exam is submitted
    if (examStatus.length === 0) {
      console.log("No active exam found");
      return res
        .status(404)
        .json({ error: "No active exam found. Please start the exam first." });
    }

    if (examStatus[0].submitted === 1) {
      console.log("Exam already submitted");
      return res
        .status(403)
        .json({ error: "You have already taken this exam." });
    }

    // ✅ Fetch questions
    let questions;
    if (questionIds) {
      // If questionIds are provided, fetch those specific questions
      const ids = questionIds.split(",").map((id) => parseInt(id));
      [questions] = await db.query(
        `SELECT DISTINCT id, question, option1, option2, option3, option4, option5, correct_option 
         FROM questions 
         WHERE \`fənnin_kodu\` = ? AND lang = ? AND id IN (?) 
         GROUP BY id
         ORDER BY FIELD(id, ?)`,
        [subjectCode, lang, ids, ids]
      );
    } else {
      // Otherwise fetch random questions as before
      [questions] = await db.query(
        `SELECT DISTINCT id, question, option1, option2, option3, option4, option5, correct_option 
         FROM questions 
         WHERE \`fənnin_kodu\` = ? AND lang = ? 
         GROUP BY id 
         ORDER BY RAND() 
         LIMIT 50`,
        [subjectCode, lang]
      );
    }

    console.log(`Found ${questions.length} questions`);

    if (questions.length === 0) {
      console.log("No questions found for subject and language combination");
      return res.status(404).json({
        error: `No questions found for subject ${subjectCode} with language ${lang}`,
      });
    }

    res.json(
      questions.map((q) => ({
        id: q.id,
        question: q.question.replace(/\n/g, "<br>"),
        option1: q.option1,
        option2: q.option2,
        option3: q.option3,
        option4: q.option4,
        option5: q.option5,
        correctOption: q.correct_option,
      }))
    );
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

// Update a question
router.put("/questions/update/:questionId", authenticate, async (req, res) => {
  try {
    // Check if user is admin or teacher
    if (req.student.status !== "staff" && req.student.status !== "teacher") {
      return res.status(403).json({
        error: "Bu əməliyyat yalnız admin və ya müəllim tərəfindən edilə bilər",
      });
    }

    const { questionId } = req.params;
    const {
      question,
      option1,
      option2,
      option3,
      option4,
      option5,
      correct_option,
    } = req.body;

    // If user is teacher, verify they teach this subject
    if (req.student.status === "teacher") {
      const [questionInfo] = await db.query(
        "SELECT fənnin_kodu FROM questions WHERE id = ?",
        [questionId]
      );

      if (questionInfo.length === 0) {
        return res.status(404).json({ error: "Sual tapılmadı" });
      }

      const [teacherSubjects] = await db.query(
        `SELECT DISTINCT s.\`Fənnin kodu\`
         FROM subjects s
         JOIN ftp f ON f.\`Fənnin kodu\` = s.\`Fənnin kodu\`
         WHERE (f.\`teacher_code\` = ? OR f.\`Professor\` = ?)
         AND s.\`Fənnin kodu\` = ?`,
        [
          req.student.studentId,
          req.student.fullname,
          questionInfo[0].fənnin_kodu,
        ]
      );

      if (teacherSubjects.length === 0) {
        return res
          .status(403)
          .json({ error: "Bu fənn üzrə sual düzəltmək üçün icazəniz yoxdur" });
      }
    }

    // Update the question
    await db.query(
      `UPDATE questions 
       SET question = ?, 
           option1 = ?, 
           option2 = ?, 
           option3 = ?, 
           option4 = ?, 
           option5 = ?, 
           correct_option = ?
       WHERE id = ?`,
      [
        question,
        option1,
        option2,
        option3,
        option4,
        option5,
        correct_option,
        questionId,
      ]
    );

    res.json({ message: "Sual uğurla yeniləndi" });
  } catch (error) {
    console.error("Error updating question:", error);
    res
      .status(500)
      .json({ error: "Sualı yeniləmək mümkün olmadı: " + error.message });
  }
});

// Create a new text question
router.post("/questions/create", authenticate, async (req, res) => {
  try {
    // Check if user is admin or teacher
    if (req.student.status !== "staff" && req.student.status !== "teacher") {
      return res.status(403).json({
        error: "Bu əməliyyat yalnız admin və ya müəllim tərəfindən edilə bilər",
      });
    }

    const {
      question,
      option1,
      option2,
      option3,
      option4,
      option5,
      correct_option,
      subjectCode,
      lang = "az", // Default to 'az' if not specified
    } = req.body;

    // Validate required fields
    if (!question || !option1 || !correct_option || !subjectCode) {
      return res.status(400).json({
        error: "Sual, variant 1, düzgün cavab və fənnin kodu mütləqdir",
      });
    }

    // If user is teacher, verify they teach this subject
    if (req.student.status === "teacher") {
      const [teacherSubjects] = await db.query(
        `SELECT DISTINCT s.\`Fənnin kodu\`
         FROM subjects s
         JOIN ftp f ON f.\`Fənnin kodu\` = s.\`Fənnin kodu\`
         WHERE (f.\`teacher_code\` = ? OR f.\`Professor\` = ?)
         AND s.\`Fənnin kodu\` = ?`,
        [req.student.studentId, req.student.fullname, subjectCode]
      );

      if (teacherSubjects.length === 0) {
        return res.status(403).json({
          error: "Bu fənn üzrə sual əlavə etmək üçün icazəniz yoxdur",
        });
      }
    }

    // Insert the new question (id will be auto-generated by MySQL)
    const [result] = await db.query(
      `INSERT INTO questions 
       (question, option1, option2, option3, option4, option5, correct_option, fənnin_kodu, lang)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        question,
        option1,
        option2,
        option3,
        option4,
        option5,
        correct_option,
        subjectCode,
        lang,
      ]
    );

    res.json({
      message: "Sual uğurla əlavə edildi",
      questionId: result.insertId,
    });
  } catch (error) {
    console.error("Error creating question:", error);
    res
      .status(500)
      .json({ error: "Sual əlavə etmək mümkün olmadı: " + error.message });
  }
});

// Import questions from JSON (converted from Excel in frontend)
router.post("/questions/import", authenticate, async (req, res) => {
  let connection;

  try {
    // Permission check
    if (req.student.status !== "staff" && req.student.status !== "teacher") {
      return res.status(403).json({
        error: "Bu əməliyyat yalnız admin və ya müəllim tərəfindən edilə bilər",
      });
    }

    const { questions: questionsData, subjectCode, lang = "az" } = req.body;

    if (!questionsData || !Array.isArray(questionsData)) {
      return res.status(400).json({
        error: "Sual məlumatları düzgün formatda deyil. JSON array gözlənilir.",
      });
    }

    if (!subjectCode) {
      return res.status(400).json({
        error: "Fənnin kodu mütləqdir",
      });
    }

    // Teacher subject check
    if (req.student.status === "teacher") {
      const [teacherSubjects] = await db.query(
        `SELECT 1
         FROM ftp
         WHERE (\`teacher_code\` = ? OR \`Professor\` = ?)
         AND \`Fənnin kodu\` = ?
         LIMIT 1`,
        [req.student.studentId, req.student.fullname, subjectCode]
      );

      if (teacherSubjects.length === 0) {
        return res.status(403).json({
          error: "Bu fənn üzrə sual əlavə etmək üçün icazəniz yoxdur",
        });
      }
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // 🔒 START TRANSACTION
    connection = await db.getConnection();
    await connection.beginTransaction();

    for (const [i, q] of questionsData.entries()) {
      try {
        const {
          question,
          option1,
          option2,
          option3,
          option4,
          option5,
          correct_option,
        } = q;

        const correctOptionInt = Number(correct_option);

        if (![1, 2, 3, 4, 5].includes(correctOptionInt)) {
          errorCount++;
          errors.push(`Sıra ${i + 1}: düzgün cavab 1–5 aralığında olmalıdır`);
          continue;
        }

        const cleanQuestion = String(question).trim();
        const cleanOption1 = String(option1).trim();
        const cleanOption2 = String(option2).trim();
        const cleanOption3 = String(option3).trim();
        const cleanOption4 = String(option4).trim();
        const cleanOption5 = String(option5).trim();

        // All fields mandatory
        if (
          !cleanQuestion ||
          !cleanOption1 ||
          !cleanOption2 ||
          !cleanOption3 ||
          !cleanOption4 ||
          !cleanOption5
        ) {
          errorCount++;
          errors.push(`Sıra ${i + 1}: Sual və bütün variantlar mütləqdir`);
          continue;
        }

        await connection.query(
          `INSERT INTO questions
           (question, option1, option2, option3, option4, option5, correct_option, fənnin_kodu, lang)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cleanQuestion,
            cleanOption1,
            cleanOption2,
            cleanOption3,
            cleanOption4,
            cleanOption5,
            correctOptionInt,
            subjectCode,
            lang,
          ]
        );

        successCount++;
      } catch (err) {
        console.error(`Error inserting row ${i + 1}:`, err);
        errorCount++;
        errors.push(`Sıra ${i + 1}: ${err.message}`);
      }
    }

    // ✅ COMMIT ONLY IF NO UNEXPECTED ERROR
    await connection.commit();

    res.json({
      message: "İmport tamamlandı",
      successCount,
      errorCount,
      total: questionsData.length,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    if (connection) await connection.rollback();

    console.error("Import failed:", error);
    res.status(500).json({
      error: "Sualları import etmək mümkün olmadı: " + error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

// Delete a question
router.delete(
  "/questions/delete/:questionId",
  authenticate,
  async (req, res) => {
    try {
      // Check if user is admin or teacher
      if (req.student.status !== "staff" && req.student.status !== "teacher") {
        return res.status(403).json({
          error:
            "Bu əməliyyat yalnız admin və ya müəllim tərəfindən edilə bilər",
        });
      }

      const { questionId } = req.params;

      // If user is teacher, verify they teach this subject
      if (req.student.status === "teacher") {
        const [questionInfo] = await db.query(
          "SELECT fənnin_kodu FROM questions WHERE id = ?",
          [questionId]
        );

        if (questionInfo.length === 0) {
          return res.status(404).json({ error: "Sual tapılmadı" });
        }

        const [teacherSubjects] = await db.query(
          `SELECT DISTINCT s.\`Fənnin kodu\`
         FROM subjects s
         JOIN ftp f ON f.\`Fənnin kodu\` = s.\`Fənnin kodu\`
         WHERE (f.\`teacher_code\` = ? OR f.\`Professor\` = ?)
         AND s.\`Fənnin kodu\` = ?`,
          [
            req.student.studentId,
            req.student.fullname,
            questionInfo[0].fənnin_kodu,
          ]
        );

        if (teacherSubjects.length === 0) {
          return res
            .status(403)
            .json({ error: "Bu fənn üzrə sual silmək üçün icazəniz yoxdur" });
        }
      }

      // Check if question exists
      const [questionExists] = await db.query(
        "SELECT id FROM questions WHERE id = ?",
        [questionId]
      );

      if (questionExists.length === 0) {
        return res.status(404).json({ error: "Sual tapılmadı" });
      }

      // Delete the question
      await db.query("DELETE FROM questions WHERE id = ?", [questionId]);

      res.json({ message: "Sual uğurla silindi" });
    } catch (error) {
      console.error("Error deleting question:", error);
      res
        .status(500)
        .json({ error: "Sualı silmək mümkün olmadı: " + error.message });
    }
  }
);

export default router;
