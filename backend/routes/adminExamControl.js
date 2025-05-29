import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";
import { getIO } from "../socket/ioInstance.js";

const router = express.Router();

// Set up socket event handlers
const setupSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log("New socket connection:", socket.id);

    socket.on("join_room", (roomId) => {
      console.log(`Socket ${socket.id} joining room:`, roomId);
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room:`, roomId);
    });

    socket.on("join_exam", ({ roomId }) => {
      console.log(`Socket ${socket.id} joining exam room:`, roomId);
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined exam room:`, roomId);
    });
  });
};

// Initialize socket handlers when the server starts
let io;
export const initAdminSocket = (socketIO) => {
  io = socketIO;
  setupSocketHandlers(io);
};

router.get("/active-students", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        s.\`Soyadı, adı və ata adı\` AS fullname,
        s.\`Tələbə_kodu\` AS id,
        sub.\`Fənnin adı\` AS subject,
        sub.\`Fənnin kodu\` AS subjectCode,
        r.extra_time AS bonusTime,
        CONCAT(s.\`Tələbə_kodu\`, '_', sub.\`Fənnin kodu\`) AS roomId,
        TIMESTAMPDIFF(SECOND, NOW(), r.created_at + INTERVAL 90 MINUTE + INTERVAL r.extra_time MINUTE) AS timeLeft
      FROM results r
      JOIN students s ON r.\`Tələbə_kodu\` = s.\`Tələbə_kodu\`
      JOIN subjects sub ON r.\`Fənnin kodu\` = sub.\`Fənnin kodu\`
      WHERE r.submitted = false
        AND NOW() < r.created_at + INTERVAL 90 MINUTE + INTERVAL r.extra_time MINUTE
    `);

    const students = rows.map((row) => ({
      ...row,
      timeLeft: Math.max(0, row.timeLeft),
    }));

    res.json({ students });
  } catch (err) {
    console.error("Error fetching active students:", err);
    res.status(500).json({ error: "Failed to fetch active students" });
  }
});

router.get("/exam-time/:subjectCode", authenticate, async (req, res) => {
  const { subjectCode } = req.params;
  const studentId = req.student.studentId;

  if (!subjectCode.match(/^[A-Za-z0-9]+$/)) {
    return res.status(400).json({ error: "Invalid subject code" });
  }

  try {
    const [rows] = await db.query(
      `SELECT TIMESTAMPDIFF(SECOND, NOW(), created_at + INTERVAL 90 MINUTE + INTERVAL extra_time MINUTE) AS timeLeft
       FROM results 
       WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ? AND submitted = false`,
      [studentId, subjectCode]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "No active exam session found" });
    }

    res.json({ timeLeft: Math.max(0, rows[0].timeLeft) });
  } catch (err) {
    console.error("Error fetching exam time:", err);
    res.status(500).json({ error: "Failed to fetch exam time" });
  }
});

// 🚫 Stop a student's exam
router.post("/stop-exam", authenticate, async (req, res) => {
  const { studentId, subjectCode } = req.body;

  if (!studentId.match(/^\d{8}$/) || !subjectCode.match(/^[A-Za-z0-9]+$/)) {
    return res
      .status(400)
      .json({ error: "Invalid student ID or subject code" });
  }

  try {
    const [rows] = await db.query(
      `SELECT id FROM results 
       WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ? AND submitted = false`,
      [studentId, subjectCode]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "No active exam session found" });
    }

    await db.query(
      `UPDATE results SET submitted = true, submitted_at = NOW() 
       WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
      [studentId, subjectCode]
    );

    const io = getIO();
    io.to(studentId).emit("exam_stopped");

    res.json({ message: "Exam stopped for the student." });
  } catch (err) {
    console.error("Error stopping exam:", err);
    res.status(500).json({ error: "Failed to stop exam" });
  }
});

// ⏳ Give extra time
router.post("/extend-time", authenticate, async (req, res) => {
  const { studentId, subjectCode, minutes } = req.body;

  if (
    !subjectCode?.match(/^[A-Za-z0-9]+$/) ||
    !Number.isInteger(minutes) ||
    minutes <= 0
  ) {
    return res.status(400).json({ error: "Invalid subject code or minutes" });
  }

  try {
    const [rows] = await db.query(
      `SELECT id FROM results 
       WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ? AND submitted = false`,
      [studentId, subjectCode]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "No active exam session found" });
    }

    await db.query(
      `UPDATE results SET extra_time = extra_time + ? 
       WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
      [minutes, studentId, subjectCode]
    );

    const io = getIO();
    const roomId = `${studentId}_${subjectCode}`;
    io.to(roomId).emit("extend_time", minutes);

    res.json({ message: "Extra time granted and socket notified." });
  } catch (err) {
    console.error("Error extending time:", err);
    res.status(500).json({ error: "Failed to grant extra time" });
  }
});

// Force submit exam
router.post("/force-submit", authenticate, async (req, res) => {
  const { studentId, subjectCode } = req.body;
  let connection;

  console.log(`Force submit request received:`, { studentId, subjectCode });

  if (!subjectCode?.match(/^[A-Za-z0-9]+$/)) {
    console.log("Invalid input:", { studentId, subjectCode });
    return res.status(400).json({ error: "Invalid subject code" });
  }

  const roomId = `${studentId}_${subjectCode}`;

  try {
    // Get IO instance first to fail fast if there's an issue
    const io = getIO();
    console.log("Successfully got IO instance");

    // Get connection from pool
    connection = await db.getConnection();
    console.log("Got database connection");

    // Start transaction
    await connection.beginTransaction();
    console.log("Transaction started");

    try {
      // Check exam status
      const [examStatus] = await connection.query(
        `SELECT id, submitted, force_submit, 
                TIMESTAMPDIFF(SECOND, NOW(), created_at + INTERVAL 90 MINUTE + INTERVAL extra_time MINUTE) AS timeLeft
         FROM results 
         WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
        [studentId, subjectCode]
      );

      console.log("Exam status query result:", examStatus[0]);

      if (examStatus.length === 0) {
        await connection.rollback();
        console.log("No exam found");
        return res.status(404).json({ error: "No exam session found" });
      }

      if (examStatus[0].submitted) {
        await connection.rollback();
        console.log("Exam already submitted");
        return res.status(400).json({ error: "Exam is already submitted" });
      }

      if (examStatus[0].force_submit) {
        await connection.rollback();
        console.log("Force submit already in progress");
        return res
          .status(400)
          .json({ error: "Force submit already in progress" });
      }

      // Immediately update result with 0 points
      const updateResult = await connection.query(
        `UPDATE results 
         SET submitted = 1, 
             submitted_at = NOW(),
             score = 0,
             total_questions = 0,
             force_submit = 1,
             force_submit_time = NOW()
         WHERE id = ? AND submitted = 0`,
        [examStatus[0].id]
      );

      console.log("Update result:", updateResult);

      // Notify student about force submit
      console.log("Emitting force_submit event to room:", roomId);
      try {
        // First check if the room exists
        const room = io.sockets.adapter.rooms.get(roomId);
        console.log("Room exists:", !!room);
        if (room) {
          console.log("Number of clients in room:", room.size);
        }

        // Emit to specific room
        io.to(roomId).emit("force_submit");
        console.log("Force submit event emitted");

        // Also try emitting to all sockets in the room
        const sockets = await io.in(roomId).fetchSockets();
        console.log("Number of sockets in room:", sockets.length);
        sockets.forEach((socket) => {
          console.log("Emitting to socket:", socket.id);
          socket.emit("force_submit");
        });

        // If no sockets found, try to find the socket by student ID
        if (sockets.length === 0) {
          const allSockets = await io.fetchSockets();
          const studentSocket = allSockets.find(
            (s) => s.handshake.auth.studentId === studentId
          );
          if (studentSocket) {
            console.log("Found student socket directly, emitting force_submit");
            studentSocket.emit("force_submit");
          }
        }
      } catch (err) {
        console.error("Error emitting force_submit event:", err);
      }

      // Commit transaction
      await connection.commit();
      console.log("Transaction committed");

      res.json({
        message: `Force submit completed for student ${studentId}`,
        roomId,
      });
    } catch (err) {
      console.error("Error during force submit transaction:", err);
      console.error("Error stack:", err.stack);
      await connection.rollback();
      throw err;
    }
  } catch (err) {
    console.error("Error force submitting exam:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({
      error: "Failed to force submit exam",
      details: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

export default router;
