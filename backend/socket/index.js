import { Server } from "socket.io";
import { initSocket } from "./ioInstance.js";
import db from "../db.js";

// Map to track socket IDs for active students
const socketMap = new Map(); // Map<studentId, { socketId, subjectCode }>

let io;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://192.168.9.143:3000",
        "http://192.168.11.163:3000",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 20000,
    pingInterval: 10000,
  });

  initSocket(io);

  const updateActiveStudents = async () => {
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

      io.emit("update_active_students", students);
    } catch (err) {
      console.error("Error updating active students:", err);
    }
  };

  io.on("connection", (socket) => {
    console.log("🟢 New socket connected:", socket.id);

    socket.on("join_exam", async ({ roomId }) => {
      try {
        // Extract studentId and subjectCode from roomId
        const [studentId, subjectCode] = roomId.split("_");

        if (!studentId || !subjectCode) {
          console.log("Invalid room ID format:", roomId);
          socket.emit("error", "Invalid room ID format.");
          return;
        }

        // Validate exam session
        const [results] = await db.query(
          `SELECT submitted, TIMESTAMPDIFF(SECOND, NOW(), created_at + INTERVAL 90 MINUTE + INTERVAL extra_time MINUTE) AS timeLeft
           FROM results 
           WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
          [studentId, subjectCode]
        );

        if (results.length === 0) {
          console.log(
            `No exam session found for ${studentId} in ${subjectCode}`
          );
          socket.emit("error", "No active exam session found.");
          return;
        }

        if (results[0].submitted === 1) {
          console.log(
            `Exam already submitted for ${studentId} in ${subjectCode}`
          );
          socket.emit("force_submit");
          socket.emit("exam_stopped");
          return;
        }

        socket.studentId = studentId;
        socket.subjectCode = subjectCode;
        socket.roomId = roomId;

        socketMap.set(studentId, { socketId: socket.id, subjectCode, roomId });

        // Leave any existing rooms
        Array.from(socket.rooms).forEach((room) => {
          if (room !== socket.id) {
            socket.leave(room);
          }
        });

        socket.join(roomId);
        console.log(
          `Student ${studentId} joined room ${roomId} for ${subjectCode}`
        );

        // Send initial timer state
        socket.emit("update_time", {
          timeLeft: Math.max(0, results[0].timeLeft),
        });
      } catch (err) {
        console.error("Error in join_exam:", err);
        socket.emit("error", "Failed to join exam.");
      }
    });

    socket.on("leave_exam", ({ roomId }) => {
      if (roomId) {
        socket.leave(roomId);
        console.log(`Client ${socket.id} left room: ${roomId}`);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`🔴 Socket disconnected: ${socket.id}, Reason: ${reason}`);
      if (socket.studentId) {
        setTimeout(async () => {
          if (
            socketMap.has(socket.studentId) &&
            socketMap.get(socket.studentId).socketId === socket.id
          ) {
            socketMap.delete(socket.studentId);
            io.emit("student_disconnected", { studentId: socket.studentId });
            updateActiveStudents();
          }
        }, 30000); // 30-second grace period
      }
    });
  });

  // Sync timers and notify clients every second
  setInterval(async () => {
    try {
      // First get all active exams (including recently submitted ones)
      const [rows] = await db.query(`
        SELECT 
          r.Tələbə_kodu AS studentId,
          r.\`Fənnin kodu\` AS subjectCode,
          s.\`Soyadı, adı və ata adı\` AS fullname,
          sub.\`Fənnin adı\` AS subject,
          r.extra_time AS bonusTime,
          r.submitted,
          CONCAT(r.Tələbə_kodu, '_', r.\`Fənnin kodu\`) AS roomId,
          TIMESTAMPDIFF(SECOND, NOW(), r.created_at + INTERVAL 90 MINUTE + INTERVAL r.extra_time MINUTE) AS timeLeft,
          TIMESTAMPDIFF(SECOND, NOW(), r.submitted_at + INTERVAL 5 SECOND) AS gracePeriod
        FROM results r
        JOIN students s ON r.Tələbə_kodu = s.Tələbə_kodu
        JOIN subjects sub ON r.\`Fənnin kodu\` = sub.\`Fənnin kodu\`
        WHERE (r.submitted = false AND NOW() < r.created_at + INTERVAL 90 MINUTE + INTERVAL r.extra_time MINUTE)
           OR (r.submitted = true AND r.submitted_at > NOW() - INTERVAL 5 SECOND)
      `);

      const activeStudents = rows
        .map((row) => ({
          id: row.studentId,
          subjectCode: row.subjectCode,
          roomId: row.roomId,
          fullname: row.fullname,
          subject: row.subject,
          bonusTime: row.bonusTime,
          submitted: row.submitted,
          timeLeft: Math.max(0, row.timeLeft),
          gracePeriod: row.gracePeriod,
        }))
        .filter((student) => !student.submitted || student.gracePeriod > 0);

      // Update timers and check for expiration
      activeStudents.forEach(async (student) => {
        const roomId = `${student.id}_${student.subjectCode}`;
        // console.log(
        //   `Sending update to room: ${roomId}, Time left: ${student.timeLeft}, Submitted: ${student.submitted}`
        // );

        if (!student.submitted) {
          io.to(roomId).emit("update_time", {
            timeLeft: student.timeLeft,
          });

          if (student.timeLeft <= 0) {
            console.log(
              `Time expired for student ${student.id} in subject ${student.subjectCode}`
            );
            await db.query(
              `UPDATE results SET submitted = true, submitted_at = NOW() 
               WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
              [student.id, student.subjectCode]
            );
            io.to(roomId).emit("force_submit");
            io.to(roomId).emit("exam_stopped");
          }
        }
      });

      // Notify admin panel only about truly active students
      const activeForAdmin = activeStudents.filter(
        (student) => !student.submitted
      );
      io.emit("update_active_students", activeForAdmin);
    } catch (err) {
      console.error("Error syncing timers:", err);
    }
  }, 1000);

  // Start periodic updates of active students
  setInterval(updateActiveStudents, 30000); // Update every 30 seconds

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
