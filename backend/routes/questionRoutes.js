import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// 🔁 Utility to shuffle an array
const shuffleArray = (array) => array.sort(() => Math.random() - 0.5);

router.get("/questions/:subjectCode", authenticate, async (req, res) => {
  try {
    const { subjectCode } = req.params;
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

    // Get the language for this subject from FTP table
    const [subjectInfo] = await db.query(
      "SELECT lang FROM FTP WHERE Tələbə_kodu = ? AND `Fənnin kodu` = ?",
      [studentId, subjectCode]
    );

    console.log("Subject info from FTP:", subjectInfo);

    if (subjectInfo.length === 0) {
      console.log("No subject info found in FTP table");
      return res
        .status(404)
        .json({ error: "Subject not found for this student in FTP table." });
    }

    const language = subjectInfo[0].lang;
    console.log("Language found:", language);

    // ✅ Fetch questions
    const [questions] = await db.query(
      "SELECT * FROM questions WHERE `fənnin_kodu` = ? AND lang = ? ORDER BY RAND() LIMIT 50",
      [subjectCode, language]
    );

    console.log(`Found ${questions.length} questions`);

    if (questions.length === 0) {
      console.log("No questions found for subject and language combination");
      return res.status(404).json({
        error: `No questions found for subject ${subjectCode} with language ${language}`,
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
    res.status(500).json({ error: "Internal Server Error: " + error.message });
  }
});

// Update a question
router.put("/questions/update/:questionId", authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.student.status !== "staff") {
      return res
        .status(403)
        .json({ error: "Bu əməliyyat yalnız admin tərəfindən edilə bilər" });
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

export default router;
