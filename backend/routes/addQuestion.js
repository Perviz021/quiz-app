import express from "express";
import upload from "../middlewares/multerConfig.js";
import db from "../db.js";
import path from "path";

const router = express.Router();

const questionUpload = upload.fields([
  { name: "option1", maxCount: 1 },
  { name: "option2", maxCount: 1 },
  { name: "option3", maxCount: 1 },
  { name: "option4", maxCount: 1 },
  { name: "option5", maxCount: 1 },
]);

router.post("/add-question", questionUpload, async (req, res) => {
  try {
    const { question, correctOption, subjectCode } = req.body;

    if (!question || !correctOption || !subjectCode) {
      return res
        .status(400)
        .json({ success: false, message: "Bütün sahələri doldurun." });
    }

    const options = [1, 2, 3, 4, 5].map((i) => {
      if (req.files[`option${i}`]) {
        const filename = req.files[`option${i}`][0].filename;
        return path.posix.join("/uploads/questions", filename);
      } else if (req.body[`option${i}`]) {
        return req.body[`option${i}`];
      } else {
        return null;
      }
    });

    await db.execute(
      "INSERT INTO questions (question, option1, option2, option3, option4, option5, correct_option, fənnin_kodu) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [question, ...options, correctOption, subjectCode]
    );

    res.json({ success: true, message: "Sual əlavə olundu." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Xəta baş verdi." });
  }
});

export default router;
