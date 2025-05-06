import { Server } from "socket.io";
import { setIO } from "./ioInstance.js";
import db from "../db.js";

// Map to track socket IDs for active students
const socketMap = new Map(); // Map<studentId, { socketId, subjectCode }>

export default function initSocket(server) {
  const io = new Server(server, {
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

  setIO(io);

  // Sync timers and notify clients every second
  setInterval(async () => {
    try {
      const [rows] = await db.query(`
        SELECT 
          r.Tələbə_kodu AS studentId,
          r.\`Fənnin kodu\` AS subjectCode,
          s.\`Soyadı, adı və ata adı\` AS fullname,
          sub.\`Fənnin adı\` AS subject,
          r.extra_time AS bonusTime,
          TIMESTAMPDIFF(SECOND, NOW(), r.created_at + INTERVAL 90 MINUTE + INTERVAL r.extra_time MINUTE) AS timeLeft
        FROM results r
        JOIN students s ON r.Tələbə_kodu = s.Tələbə_kodu
        JOIN subjects sub ON r.\`Fənnin kodu\` = sub.\`Fənnin kodu\`
        WHERE r.submitted = false
          AND NOW() < r.created_at + INTERVAL 90 MINUTE + INTERVAL r.extra_time MINUTE
      `);

      const activeStudents = rows.map((row) => ({
        id: row.studentId,
        subjectCode: row.subjectCode,
        fullname: row.fullname,
        subject: row.subject,
        bonusTime: row.bonusTime,
        timeLeft: Math.max(0, row.timeLeft),
      }));

      // Update timers and check for expiration
      activeStudents.forEach(async (student) => {
        io.to(student.id).emit("update_time", { timeLeft: student.timeLeft });
        if (student.timeLeft <= 0 && !student.submitted) {
          await db.query(
            `UPDATE results SET submitted = true, submitted_at = NOW() 
             WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
            [student.id, student.subjectCode]
          );
          io.to(student.id).emit("force_submit");
        }
      });

      // Notify admin panel
      io.emit("update_active_students", activeStudents);
    } catch (err) {
      console.error("Error syncing timers:", err);
    }
  }, 1000);

  io.on("connection", (socket) => {
    console.log("🟢 New socket connected:", socket.id);

    socket.on("join_exam", async ({ studentId, subjectCode }) => {
      try {
        // Validate exam session
        const [results] = await db.query(
          `SELECT TIMESTAMPDIFF(SECOND, NOW(), created_at + INTERVAL 90 MINUTE + INTERVAL extra_time MINUTE) AS timeLeft
           FROM results 
           WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ? AND submitted = false`,
          [studentId, subjectCode]
        );

        if (results.length === 0) {
          socket.emit("error", "No active exam session found.");
          return;
        }

        socket.studentId = studentId;
        socket.subjectCode = subjectCode;
        socketMap.set(studentId, { socketId: socket.id, subjectCode });
        socket.join(studentId);
        console.log(`Student ${studentId} joined room for ${subjectCode}`);

        // Send initial timer state
        socket.emit("update_time", {
          timeLeft: Math.max(0, results[0].timeLeft),
        });
      } catch (err) {
        console.error("Error in join_exam:", err);
        socket.emit("error", "Failed to join exam.");
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
            const [rows] = await db.query(`
              SELECT 
                r.Tələbə_kodu AS studentId,
                r.\`Fənnin kodu\` AS subjectCode,
                s.\`Soyadı, adı və ata adı\` AS fullname,
                sub.\`Fənnin adı\` AS subject,
                r.extra_time AS bonusTime,
                TIMESTAMPDIFF(SECOND, NOW(), r.created_at + INTERVAL 90 MINUTE + INTERVAL r.extra_time MINUTE) AS timeLeft
              FROM results r
              JOIN students s ON r.Tələbə_kodu = s.Tələbə_kodu
              JOIN subjects sub ON r.\`Fənnin kodu\` = sub.\`Fənnin kodu\`
              WHERE r.submitted = false
                AND NOW() < r.created_at + INTERVAL 90 MINUTE + INTERVAL r.extra_time MINUTE
            `);
            io.emit("update_active_students", rows);
          }
        }, 30000); // 30-second grace period
      }
    });
  });

  return io;
}
