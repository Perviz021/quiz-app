import express from "express";
import db from "../db.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

router.post("/login", async (req, res) => {
  const { studentId, password } = req.body;
  try {
    const [students] = await db.query(
      "SELECT * FROM students WHERE `Tələbə_kodu` = ? AND `Fin_kod` = ?",
      [studentId, password]
    );
    if (students.length === 0) {
      return res.status(400).json({
        error: "Tələbə kodu və ya fin kod düzgün daxil edilməmişdir!",
      });
    }
    const student = students[0];
    const [subjects] = await db.query(
      `SELECT s.\`Fənnin kodu\`, s.\`Fənnin adı\`, f.Exam_date
       FROM subjects s
       JOIN ftp f ON f.\`Fənnin kodu\` = s.\`Fənnin kodu\`
       WHERE f.\`Tələbə_kodu\` = ?`,
      [studentId]
    );
    const token = jwt.sign(
      {
        id: student.id,
        studentId: student.Tələbə_kodu,
        status: student.status,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );
    res.json({
      token,
      student: {
        id: student.id,
        studentId: student.Tələbə_kodu,
        status: student.status,
        fullname: student["Soyadı, adı və ata adı"],
      },
      subjects,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;
