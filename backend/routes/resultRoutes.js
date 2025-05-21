import express from "express";
import pool from "../db.js"; // Import your MySQL connection

const router = express.Router();

// GET /api/results/:studentId
router.get("/results/:studentId", async (req, res) => {
  const { studentId } = req.params;

  try {
    const [results] = await pool.query(
      `SELECT s.\`Fənnin adı\`, r.\`Fənnin kodu\`, r.score, r.created_at, r.submitted_at
        FROM results r
        JOIN subjects s ON r.\`Fənnin kodu\` = s.\`Fənnin kodu\`
        WHERE r.\`Tələbə_kodu\` = ?`,
      [studentId]
    );

    res.json(results);
  } catch (error) {
    console.error("Error fetching results:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/results/group/:fenn_qrupu
router.get("/results/group/:fenn_qrupu", async (req, res) => {
  // Decode the fenn_qrupu from URL
  const fenn_qrupu = decodeURIComponent(req.params.fenn_qrupu);

  try {
    const [results] = await pool.query(
      `SELECT 
        r.id,
        r.\`Tələbə_kodu\`,
        r.\`Fənnin kodu\`,
        r.score,
        r.total_questions,
        r.created_at,
        r.submitted_at,
        r.submitted,
        r.extra_time,
        r.force_submit,
        r.force_submit_time,
        s.\`Soyadı, adı və ata adı\`,
        s.\`Akademik qrup\`,
        sub.\`Fənnin adı\`,
        f.Stable as fenn_qrupu
      FROM results r
      JOIN students s ON r.\`Tələbə_kodu\` = s.\`Tələbə_kodu\`
      JOIN subjects sub ON r.\`Fənnin kodu\` = sub.\`Fənnin kodu\`
      JOIN ftp f ON r.\`Tələbə_kodu\` = f.\`Tələbə_kodu\` AND r.\`Fənnin kodu\` = f.\`Fənnin kodu\`
      WHERE f.Stable = ?
      ORDER BY r.submitted_at DESC`,
      [fenn_qrupu]
    );

    res.json(results);
  } catch (error) {
    console.error("Error fetching group results:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
