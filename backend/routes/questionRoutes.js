import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// ─────────────────────────────────────────────
// Multer setup
//
// WHY req.query instead of req.body for subjectCode:
// multer's diskStorage filename() callback runs BEFORE the multipart body
// is fully parsed, so req.body fields are not yet available at that point.
// Sending subjectCode as a query parameter (?subjectCode=XX) makes it
// available in req.query immediately, which is reliable.
//
// Frontend must call:
//   POST /api/questions/upload-image?subjectCode=FENN_KODU
// ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads/questions");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Read from query param — always available before body parsing
    const rawCode = req.query.subjectCode || "unknown";
    const subjectCode = rawCode.replace(/[^a-zA-Z0-9_\-]/g, "_");
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1_000_000);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${subjectCode}_${timestamp}_${random}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Yalnız şəkil faylları (.jpg, .png, .gif, .webp) dəstəklənir"),
      false,
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// Helper to delete an image file safely
const deleteImageFile = (imagePath) => {
  if (!imagePath) return;
  try {
    const fullPath = path.join(__dirname, "../", imagePath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch (err) {
    console.error("Failed to delete image file:", err.message);
  }
};

// ─────────────────────────────────────────────
// POST /questions/upload-image?subjectCode=FENN_KODU
// Upload a single image, return its relative path
// ─────────────────────────────────────────────
router.post(
  "/questions/upload-image",
  authenticate,
  upload.single("image"),
  (req, res) => {
    if (req.student.status !== "staff" && req.student.status !== "teacher") {
      if (req.file) deleteImageFile(`uploads/questions/${req.file.filename}`);
      return res.status(403).json({ error: "İcazəniz yoxdur" });
    }
    if (!req.file) return res.status(400).json({ error: "Şəkil tapılmadı" });

    res.json({ path: `uploads/questions/${req.file.filename}` });
  },
);

// ─────────────────────────────────────────────
// DELETE /questions/delete-image
// Remove an image file from disk
// ─────────────────────────────────────────────
router.delete("/questions/delete-image", authenticate, (req, res) => {
  if (req.student.status !== "staff" && req.student.status !== "teacher") {
    return res.status(403).json({ error: "İcazəniz yoxdur" });
  }

  const { path: imagePath } = req.body;
  if (!imagePath || !imagePath.startsWith("uploads/questions/")) {
    return res.status(400).json({ error: "Etibarsız fayl yolu" });
  }

  deleteImageFile(imagePath);
  res.json({ message: "Şəkil silindi" });
});

// ─────────────────────────────────────────────
// GET /questions/:subjectCode/:lang
// Fetch questions for exam (includes image fields)
// ─────────────────────────────────────────────
router.get("/questions/:subjectCode/:lang", authenticate, async (req, res) => {
  try {
    const { subjectCode, lang } = req.params;
    const { questionIds } = req.query;
    const studentId = req.student.studentId;

    console.log(
      `Fetching questions for student ${studentId}, subject ${subjectCode}`,
    );

    // 🔍 Check exam status
    const [examStatus] = await db.query(
      "SELECT submitted, submitted_at FROM results WHERE Tələbə_kodu = ? AND `Fənnin kodu` = ?",
      [studentId, subjectCode],
    );

    console.log("Exam status:", examStatus);

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

    // ✅ Fetch questions (including all image columns)
    let questions;
    if (questionIds) {
      const ids = questionIds.split(",").map((id) => parseInt(id));
      [questions] = await db.query(
        `SELECT DISTINCT id, question, question_image,
                option1, option1_image,
                option2, option2_image,
                option3, option3_image,
                option4, option4_image,
                option5, option5_image,
                correct_option
         FROM questions
         WHERE \`fənnin_kodu\` = ? AND lang = ? AND id IN (?)
         GROUP BY id
         ORDER BY FIELD(id, ?)`,
        [subjectCode, lang, ids, ids],
      );
    } else {
      [questions] = await db.query(
        `SELECT DISTINCT id, question, question_image,
                option1, option1_image,
                option2, option2_image,
                option3, option3_image,
                option4, option4_image,
                option5, option5_image,
                correct_option
         FROM questions
         WHERE \`fənnin_kodu\` = ? AND lang = ?
         GROUP BY id
         ORDER BY RAND()
         LIMIT 50`,
        [subjectCode, lang],
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
        question: q.question ? q.question.replace(/\n/g, "<br>") : "",
        question_image: q.question_image || null,
        option1: q.option1 || "",
        option1_image: q.option1_image || null,
        option2: q.option2 || "",
        option2_image: q.option2_image || null,
        option3: q.option3 || "",
        option3_image: q.option3_image || null,
        option4: q.option4 || "",
        option4_image: q.option4_image || null,
        option5: q.option5 || "",
        option5_image: q.option5_image || null,
        correctOption: q.correct_option,
      })),
    );
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

// ─────────────────────────────────────────────
// PUT /questions/update/:questionId
// ─────────────────────────────────────────────
router.put("/questions/update/:questionId", authenticate, async (req, res) => {
  try {
    if (req.student.status !== "staff" && req.student.status !== "teacher") {
      return res.status(403).json({
        error: "Bu əməliyyat yalnız admin və ya müəllim tərəfindən edilə bilər",
      });
    }

    const { questionId } = req.params;
    const {
      question,
      question_image,
      option1,
      option1_image,
      option2,
      option2_image,
      option3,
      option3_image,
      option4,
      option4_image,
      option5,
      option5_image,
      correct_option,
    } = req.body;

    // Teacher subject check
    if (req.student.status === "teacher") {
      const [questionInfo] = await db.query(
        "SELECT fənnin_kodu FROM questions WHERE id = ?",
        [questionId],
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
        ],
      );

      if (teacherSubjects.length === 0) {
        return res
          .status(403)
          .json({ error: "Bu fənn üzrə sual düzəltmək üçün icazəniz yoxdur" });
      }
    }

    await db.query(
      `UPDATE questions
       SET question = ?,       question_image = ?,
           option1 = ?,        option1_image = ?,
           option2 = ?,        option2_image = ?,
           option3 = ?,        option3_image = ?,
           option4 = ?,        option4_image = ?,
           option5 = ?,        option5_image = ?,
           correct_option = ?
       WHERE id = ?`,
      [
        question,
        question_image || null,
        option1,
        option1_image || null,
        option2,
        option2_image || null,
        option3,
        option3_image || null,
        option4,
        option4_image || null,
        option5,
        option5_image || null,
        correct_option,
        questionId,
      ],
    );

    res.json({ message: "Sual uğurla yeniləndi" });
  } catch (error) {
    console.error("Error updating question:", error);
    res
      .status(500)
      .json({ error: "Sualı yeniləmək mümkün olmadı: " + error.message });
  }
});

// ─────────────────────────────────────────────
// POST /questions/create
// ─────────────────────────────────────────────
router.post("/questions/create", authenticate, async (req, res) => {
  try {
    if (req.student.status !== "staff" && req.student.status !== "teacher") {
      return res.status(403).json({
        error: "Bu əməliyyat yalnız admin və ya müəllim tərəfindən edilə bilər",
      });
    }

    const {
      question,
      question_image,
      option1,
      option1_image,
      option2,
      option2_image,
      option3,
      option3_image,
      option4,
      option4_image,
      option5,
      option5_image,
      correct_option,
      subjectCode,
      lang = "az",
    } = req.body;

    // At least text OR image required for each field
    const validateField = (text, image, name) => {
      if (!text && !image)
        throw new Error(`${name} mətni və ya şəkli mütləqdir`);
    };
    try {
      validateField(question, question_image, "Sual");
      validateField(option1, option1_image, "Variant A");
      validateField(option2, option2_image, "Variant B");
      validateField(option3, option3_image, "Variant C");
      validateField(option4, option4_image, "Variant D");
      validateField(option5, option5_image, "Variant E");
    } catch (validationError) {
      return res.status(400).json({ error: validationError.message });
    }

    if (!correct_option || !subjectCode) {
      return res.status(400).json({
        error: "Düzgün cavab və fənnin kodu mütləqdir",
      });
    }

    // Teacher subject check
    if (req.student.status === "teacher") {
      const [teacherSubjects] = await db.query(
        `SELECT DISTINCT s.\`Fənnin kodu\`
         FROM subjects s
         JOIN ftp f ON f.\`Fənnin kodu\` = s.\`Fənnin kodu\`
         WHERE (f.\`teacher_code\` = ? OR f.\`Professor\` = ?)
         AND s.\`Fənnin kodu\` = ?`,
        [req.student.studentId, req.student.fullname, subjectCode],
      );

      if (teacherSubjects.length === 0) {
        return res.status(403).json({
          error: "Bu fənn üzrə sual əlavə etmək üçün icazəniz yoxdur",
        });
      }
    }

    const [result] = await db.query(
      `INSERT INTO questions
       (question, question_image,
        option1,  option1_image,
        option2,  option2_image,
        option3,  option3_image,
        option4,  option4_image,
        option5,  option5_image,
        correct_option, fənnin_kodu, lang)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        question || "",
        question_image || null,
        option1 || "",
        option1_image || null,
        option2 || "",
        option2_image || null,
        option3 || "",
        option3_image || null,
        option4 || "",
        option4_image || null,
        option5 || "",
        option5_image || null,
        correct_option,
        subjectCode,
        lang,
      ],
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

// ─────────────────────────────────────────────
// POST /questions/import  (Excel — text only, images stay null)
// ─────────────────────────────────────────────
router.post("/questions/import", authenticate, async (req, res) => {
  let connection;

  try {
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
        [req.student.studentId, req.student.fullname, subjectCode],
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
           (question, question_image,
            option1,  option1_image,
            option2,  option2_image,
            option3,  option3_image,
            option4,  option4_image,
            option5,  option5_image,
            correct_option, fənnin_kodu, lang)
           VALUES (?, NULL, ?, NULL, ?, NULL, ?, NULL, ?, NULL, ?, NULL, ?, ?, ?)`,
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
          ],
        );

        successCount++;
      } catch (err) {
        console.error(`Error inserting row ${i + 1}:`, err);
        errorCount++;
        errors.push(`Sıra ${i + 1}: ${err.message}`);
      }
    }

    // ✅ COMMIT
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

// ─────────────────────────────────────────────
// DELETE /questions/delete/:questionId
// Also deletes associated image files from disk
// ─────────────────────────────────────────────
router.delete(
  "/questions/delete/:questionId",
  authenticate,
  async (req, res) => {
    try {
      if (req.student.status !== "staff" && req.student.status !== "teacher") {
        return res.status(403).json({
          error:
            "Bu əməliyyat yalnız admin və ya müəllim tərəfindən edilə bilər",
        });
      }

      const { questionId } = req.params;

      // Fetch question including all image paths before deleting
      const [questionInfo] = await db.query(
        `SELECT fənnin_kodu, question_image,
                option1_image, option2_image, option3_image,
                option4_image, option5_image
         FROM questions WHERE id = ?`,
        [questionId],
      );

      if (questionInfo.length === 0) {
        return res.status(404).json({ error: "Sual tapılmadı" });
      }

      // Teacher subject check
      if (req.student.status === "teacher") {
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
          ],
        );

        if (teacherSubjects.length === 0) {
          return res
            .status(403)
            .json({ error: "Bu fənn üzrə sual silmək üçün icazəniz yoxdur" });
        }
      }

      // Delete image files from disk before removing DB row
      const q = questionInfo[0];
      [
        q.question_image,
        q.option1_image,
        q.option2_image,
        q.option3_image,
        q.option4_image,
        q.option5_image,
      ]
        .filter(Boolean)
        .forEach(deleteImageFile);

      // Delete the question
      await db.query("DELETE FROM questions WHERE id = ?", [questionId]);

      res.json({ message: "Sual uğurla silindi" });
    } catch (error) {
      console.error("Error deleting question:", error);
      res
        .status(500)
        .json({ error: "Sualı silmək mümkün olmadı: " + error.message });
    }
  },
);

export default router;
