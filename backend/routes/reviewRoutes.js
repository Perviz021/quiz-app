import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.get("/review/:subjectCode", authenticate, async (req, res) => {
  const studentId = req.student.studentId;
  const { subjectCode } = req.params;

  try {
    // ── 1. Get the stored shuffle map for this student's exam ───────────────
    // option_order: { "questionId": { correct: shuffledSlot, map: { "origSlot": newSlot } } }
    const [resultRows] = await db.query(
      "SELECT option_order FROM results WHERE `Tələbə_kodu` = ? AND `Fənnin kodu` = ?",
      [studentId, subjectCode],
    );

    let optionOrderMap = {};
    if (resultRows.length > 0 && resultRows[0].option_order) {
      try {
        optionOrderMap =
          typeof resultRows[0].option_order === "string"
            ? JSON.parse(resultRows[0].option_order)
            : resultRows[0].option_order;
      } catch {
        optionOrderMap = {};
      }
    }

    // ── 2. Fetch answers + original question data ───────────────────────────
    const [review] = await db.query(
      `SELECT
        q.id AS questionId,
        q.question,
        q.question_image,
        q.option1,        q.option1_image,
        q.option2,        q.option2_image,
        q.option3,        q.option3_image,
        q.option4,        q.option4_image,
        q.option5,        q.option5_image,
        q.correct_option,
        a.selected_option
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      WHERE a.\`Tələbə_kodu\` = ? AND a.\`Fənnin kodu\` = ?`,
      [studentId, subjectCode],
    );

    // ── 3. Reconstruct each question in the shuffled order ──────────────────
    // The student's selected_option refers to the SHUFFLED slot they saw.
    // The review page must show options in that same shuffled order so that
    // selected_option still points at the right option visually.
    // correct_option must also be remapped to the shuffled correct slot.
    const response = review.map((q) => {
      const stored = optionOrderMap[q.questionId];

      if (!stored) {
        // No shuffle map for this question — return as-is (fallback)
        return q;
      }

      // stored.map: { "originalSlot": newSlot }
      // We need the reverse: newSlot → originalSlot
      const slotToOriginal = {};
      for (const [orig, newSlot] of Object.entries(stored.map)) {
        slotToOriginal[Number(newSlot)] = Number(orig);
      }

      // Build shuffled options
      const shuffledOptions = {};
      for (let newSlot = 1; newSlot <= 5; newSlot++) {
        const origSlot = slotToOriginal[newSlot];
        shuffledOptions[`option${newSlot}`] = origSlot
          ? q[`option${origSlot}`] || null
          : null;
        shuffledOptions[`option${newSlot}_image`] = origSlot
          ? q[`option${origSlot}_image`] || null
          : null;
      }

      return {
        questionId: q.questionId,
        question: q.question,
        question_image: q.question_image,
        ...shuffledOptions,
        correct_option: stored.correct, // shuffled correct slot
        selected_option: q.selected_option, // already in shuffled slots
      };
    });

    res.json(response);
  } catch (error) {
    console.error("Error fetching review data:", error);
    res.status(500).json({ error: "Failed to fetch review data" });
  }
});

export default router;
