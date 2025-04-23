import express from "express";
import upload from "../middleware/multerConfig.js";
import db from "../db.js";
import path from "path";
import multer from "multer";

const router = express.Router();

// Setup Multer to store uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/questions/");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const cpUpload = upload.fields([
  { name: "questionImage", maxCount: 1 },
  { name: "option1Image", maxCount: 1 },
  { name: "option2Image", maxCount: 1 },
  { name: "option3Image", maxCount: 1 },
  { name: "option4Image", maxCount: 1 },
  { name: "option5Image", maxCount: 1 },
]);

router.post("/add-question", cpUpload, async (req, res) => {
  try {
    const {
      questionText,
      option1Text,
      option2Text,
      option3Text,
      option4Text,
      option5Text,
      correctOption,
      subjectCode,
    } = req.body;

    const questionImage = req.files["questionImage"]?.[0]?.filename;
    const questionField =
      questionText || questionImage
        ? `${questionText || ""}||image:${questionImage || ""}`
        : null;

    const getOptionValue = (text, imageFieldName) => {
      const image = req.files[imageFieldName]?.[0]?.filename;
      if (text || image) {
        return `${text || ""}||image:${image || ""}`;
      }
      return null;
    };

    const values = [
      questionField,
      getOptionValue(option1Text, "option1Image"),
      getOptionValue(option2Text, "option2Image"),
      getOptionValue(option3Text, "option3Image"),
      getOptionValue(option4Text, "option4Image"),
      getOptionValue(option5Text, "option5Image"),
      correctOption,
      subjectCode,
    ];

    await db.query(
      `INSERT INTO questions 
      (question, option1, option2, option3, option4, option5, correct_option, fənnin_kodu)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      values
    );

    res.json({ success: true, message: "Sual uğurla əlavə edildi!" });
  } catch (error) {
    console.error("Error saving question:", error);
    res.status(500).json({ success: false, message: "Server xətası!" });
  }
});

export default router;
