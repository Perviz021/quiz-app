import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// ✅ Use connection pool for better performance
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

// ✅ Student Login
app.post("/login", async (req, res) => {
  const { studentId, password } = req.body;
  try {
    // Fetch student by studentId
    const [students] = await db.query(
      "SELECT * FROM students WHERE student_id = ?",
      [studentId]
    );
    if (students.length === 0)
      return res.status(400).json({ error: "Student not found" });

    const student = students[0];

    // Compare password
    const isValidPassword = await bcrypt.compare(password, student.password);
    if (!isValidPassword)
      return res.status(401).json({ error: "Invalid credentials" });

    console.log("JWT_SECRET:", process.env.JWT_SECRET);

    // Generate JWT token
    const token = jwt.sign(
      { id: student.id, studentId: student.student_id, name: student.name },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      token,
      student: {
        id: student.id,
        name: student.name,
        studentId: student.student_id,
      },
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
app.get("/questions/:subjectId", authenticate, async (req, res) => {
  try {
    const { subjectId } = req.params;
    const [questions] = await db.query(
      "SELECT * FROM questions WHERE subject_id = ?",
      [subjectId]
    );
    res.json(questions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Submit exam results (Protected Route)
app.post("/submit", authenticate, async (req, res) => {
  const { studentId } = req.student;
  const { subjectId, answers } = req.body;

  if (!studentId || !subjectId || !Array.isArray(answers)) {
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

      if (result.length === 0) continue; // Skip if question ID is invalid

      const isCorrect = result[0].correct_option === ans.selectedOption;
      if (isCorrect) score++;

      // Queue insert for answers table
      queries.push(
        db.query(
          "INSERT INTO answers (student_id, subject_id, question_id, selected_option, is_correct) VALUES (?, ?, ?, ?, ?)",
          [studentId, subjectId, ans.questionId, ans.selectedOption, isCorrect]
        )
      );
    }

    // Insert all answers in parallel
    await Promise.all(queries);

    // Store final result in `results` table
    await db.query(
      "INSERT INTO results (student_id, subject_id, score, total_questions, submitted_at) VALUES (?, ?, ?, ?, NOW())",
      [studentId, subjectId, score, answers.length]
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
