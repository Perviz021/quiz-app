import express from "express";
import db from "../db.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { authenticate } from "../middleware/auth.js";

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

    let subjects = [];
    if (student.status === "student") {
      [subjects] = await db.query(
        `SELECT s.\`Fənnin kodu\`, s.\`Fənnin adı\`, f.Exam_date, f.Stable, f.lang, f.\`Pre-Exam\`, f.Professor, f.FSK, f.FK, f.Qaib, f.EP
         FROM subjects s
         JOIN ftp f ON f.\`Fənnin kodu\` = s.\`Fənnin kodu\`
         WHERE f.\`Tələbə_kodu\` = ?`,
        [studentId]
      );
    } else if (student.status === "teacher") {
      [subjects] = await db.query(
        `SELECT DISTINCT s.\`Fənnin kodu\`, s.\`Fənnin adı\`, f.lang
         FROM subjects s
         JOIN ftp f ON f.\`Fənnin kodu\` = s.\`Fənnin kodu\`
         WHERE f.\`teacher_code\` = ? OR f.\`Professor\` = ?`,
        [studentId, student["Soyadı, adı və ata adı"]]
      );
    }

    const token = jwt.sign(
      {
        id: student.id,
        studentId: student.Tələbə_kodu,
        status: student.status,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.json({
      token,
      student: {
        id: student.id,
        studentId: student.Tələbə_kodu,
        status: student.status,
        fullname: student["Soyadı, adı və ata adı"],
        group: student["Akademik qrup"],
        faculty: student.faculty,
        ixtisaslasma: student[`İxtisaslaşma adı`],
      },
      subjects,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/update-exam-parameter", authenticate, async (req, res) => {
  const { studentId, subjectGroup, newEP } = req.body;

  try {
    if (req.student.status !== "staff") {
      return res
        .status(403)
        .json({ error: "Yalnız admin imtahan parametrlərini yeniləyə bilər!" });
    }

    const [result] = await db.query(
      "UPDATE ftp SET EP = ? WHERE `Tələbə_kodu` = ? AND `Stable` = ?",
      [newEP, studentId, subjectGroup]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Tələbə və ya fənn qrupu tapılmadı" });
    }

    res.json({ message: "İmtahan parametri uğurla yeniləndi" });
  } catch (error) {
    console.error("İmtahan parametrini yeniləmək mümkün olmadı:", error);
    res
      .status(500)
      .json({ error: "İmtahan parametrini yeniləmək mümkün olmadı" });
  }
});

export default router;
