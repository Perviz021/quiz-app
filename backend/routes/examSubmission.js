router.post("/submit", authenticate, async (req, res) => {
  const studentId = req.student.studentId;
  const { subjectCode, answers, isForceSubmit } = req.body;

  try {
    // Check exam status
    const [examStatus] = await db.query(
      `SELECT submitted, force_submit, force_submit_time,
              TIMESTAMPDIFF(SECOND, force_submit_time, NOW()) as seconds_since_force
       FROM results 
       WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
      [studentId, subjectCode]
    );

    if (examStatus.length === 0) {
      return res.status(403).json({ error: "No active exam session found" });
    }

    const exam = examStatus[0];

    // If exam is submitted and it's not a force-submit case, reject
    if (exam.submitted && !exam.force_submit) {
      return res.status(403).json({ error: "Exam already submitted" });
    }

    // If it's a force-submit case, check if we're within grace period (10 seconds)
    if (exam.force_submit && exam.seconds_since_force > 10) {
      return res
        .status(403)
        .json({ error: "Force submit grace period expired" });
    }

    // Get questions for scoring
    const [questions] = await db.query(
      "SELECT id, correct_option FROM questions WHERE `Fənnin kodu` = ?",
      [subjectCode]
    );

    // Calculate score
    let score = 0;
    for (const answer of answers) {
      const question = questions.find((q) => q.id === answer.questionId);
      if (question && question.correct_option === answer.selectedOption) {
        score++;
      }
    }

    // Begin transaction
    await db.beginTransaction();

    try {
      // Save answers
      for (const answer of answers) {
        await db.query(
          `INSERT INTO answers (Tələbə_kodu, \`Fənnin kodu\`, question_id, selected_option)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE selected_option = VALUES(selected_option)`,
          [studentId, subjectCode, answer.questionId, answer.selectedOption]
        );
      }

      // Update result
      await db.query(
        `UPDATE results 
         SET submitted = true, 
             submitted_at = NOW(),
             score = ?,
             total_questions = ?
         WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
        [score, questions.length, studentId, subjectCode]
      );

      await db.commit();
      res.json({ score });
    } catch (err) {
      await db.rollback();
      throw err;
    }
  } catch (err) {
    console.error("Error submitting exam:", err);
    res.status(500).json({ error: "Failed to submit exam" });
  }
});
