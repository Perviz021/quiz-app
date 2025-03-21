import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// ✅ Use connection pool
const db = await mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ✅ Middleware to verify JWT Token
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid token" });

    req.student = decoded;
    next();
  });
};

// ✅ Student Login & Fetch Subjects
app.post("/login", async (req, res) => {
  const { studentId, password } = req.body;

  console.log("Telebe kodu: ", studentId);
  console.log("Fin kodu: ", password);

  try {
    // Authenticate student
    const [students] = await db.query(
      "SELECT * FROM students WHERE `Tələbə_kodu` = ? AND `Fin_kod` = ?",
      [studentId, password]
    );

    if (students.length === 0) {
      return res.status(400).json({ error: "Invalid student ID or password" });
    }

    const student = students[0];

    // Fetch subjects for the student using `Fənnin kodu`
    const [subjects] = await db.query(
      `SELECT s.\`Fənnin kodu\`, s.\`Fənnin adı\`
       FROM subjects s
       JOIN students st ON st.\`Fənnin kodu\` = s.\`Fənnin kodu\`
       WHERE st.\`Tələbə_kodu\` = ?`,
      [studentId]
    );

    // Generate JWT token
    const token = jwt.sign(
      { id: student.id, studentId: student.Tələbə_kodu },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      token,
      student: {
        id: student.id,
        studentId: student.Tələbə_kodu,
      },
      subjects, // Now includes subject ID and name
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// ✅ Fetch all subjects (Protected Route)
app.get("/subjects", authenticate, async (req, res) => {
  try {
    const [subjects] = await db.query("SELECT * FROM subjects");
    res.json(subjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Fetch questions for a subject (Protected Route)
app.get("/questions/:subjectCode", authenticate, async (req, res) => {
  try {
    const { subjectCode } = req.params;
    const [questions] = await db.query(
      "SELECT * FROM questions WHERE `fənnin_kodu` = ?",
      [subjectCode]
    );
    res.json(questions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Fix `/submit` to use subjectCode correctly
app.post("/submit", authenticate, async (req, res) => {
  const { studentId } = req.student;
  const { subjectCode, answers } = req.body;

  if (!studentId || !subjectCode || !Array.isArray(answers)) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  try {
    let score = 0;
    const queries = [];

    for (const ans of answers) {
      const [result] = await db.query(
        "SELECT correct_option FROM questions WHERE id = ?",
        [ans.questionId]
      );

      if (result.length === 0) continue;

      const isCorrect = result[0].correct_option === ans.selectedOption;
      if (isCorrect) score++;

      queries.push(
        db.query(
          "INSERT INTO answers (student_id, subject_code, question_id, selected_option, is_correct) VALUES (?, ?, ?, ?, ?)",
          [
            studentId,
            subjectCode,
            ans.questionId,
            ans.selectedOption,
            isCorrect,
          ]
        )
      );
    }

    await Promise.all(queries);

    await db.query(
      "INSERT INTO results (student_id, subject_code, score, total_questions, submitted_at) VALUES (?, ?, ?, ?, NOW())",
      [studentId, subjectCode, score, answers.length]
    );

    res.json({ message: "Exam submitted successfully", score });
  } catch (error) {
    console.error("Error saving results:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Server listen
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
