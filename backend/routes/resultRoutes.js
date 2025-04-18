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

export default router;
