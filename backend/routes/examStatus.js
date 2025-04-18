router.get("/exam-status", authenticate, async (req, res) => {
  const { studentId } = req.student;
  const { subjectCode } = req.query;

  const [rows] = await db.query(
    `SELECT is_active, extra_time, force_submit FROM results WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
    [studentId, subjectCode]
  );

  if (rows.length === 0)
    return res.status(404).json({ error: "No exam found." });

  res.json(rows[0]);
});
