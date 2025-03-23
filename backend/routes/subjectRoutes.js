import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.get("/subjects", authenticate, async (req, res) => {
  try {
    const [subjects] = await db.query("SELECT * FROM subjects");
    res.json(subjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
