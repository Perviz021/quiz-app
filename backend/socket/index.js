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
        "http://192.168.9.8:3000",
        "http://192.168.9.30:3000",
        "http://192.168.1.69:3000",
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
          `SELECT submitted, force_submit, TIMESTAMPDIFF(SECOND, NOW(), created_at + INTERVAL 90 MINUTE + INTERVAL extra_time MINUTE) AS timeLeft
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
          socket.emit("exam_stopped");
          return;
        }

        socket.studentId = studentId;
        socket.subjectCode = subjectCode;
        socket.roomId = roomId;

        // Store socket info in map
        socketMap.set(studentId, { socketId: socket.id, subjectCode, roomId });

        // Leave any existing rooms
        Array.from(socket.rooms).forEach((room) => {
          if (room !== socket.id) {
            socket.leave(room);
          }
        });

        // Join the exam room
        socket.join(roomId);
        // console.log(
        //   `Student ${studentId} joined room ${roomId} for ${subjectCode}`
        // );

        // Send initial timer state
        socket.emit("update_time", {
          timeLeft: Math.max(0, results[0].timeLeft),
          isForceSubmit: results[0].force_submit === 1,
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
      // Get all active exams
      const [rows] = await db.query(`
        SELECT 
          r.id,
          r.Tələbə_kodu AS studentId,
          r.\`Fənnin kodu\` AS subjectCode,
          s.\`Soyadı, adı və ata adı\` AS fullname,
          sub.\`Fənnin adı\` AS subject,
          r.extra_time AS bonusTime,
          r.submitted,
          r.force_submit,
          r.force_submit_time,
          TIMESTAMPDIFF(SECOND, NOW(), r.created_at + INTERVAL 90 MINUTE + INTERVAL r.extra_time MINUTE) AS timeLeft,
          TIMESTAMPDIFF(SECOND, NOW(), r.force_submit_time + INTERVAL 10 SECOND) AS forceSubmitTimeLeft,
          CONCAT(r.Tələbə_kodu, '_', r.\`Fənnin kodu\`) AS roomId
        FROM results r
        JOIN students s ON r.\`Tələbə_kodu\` = s.\`Tələbə_kodu\`
        JOIN subjects sub ON r.\`Fənnin kodu\` = sub.\`Fənnin kodu\`
        WHERE (r.submitted = 0) 
           OR (r.force_submit = 1 AND r.force_submit_time > NOW() - INTERVAL 10 SECOND)
      `);

      console.log(`Processing ${rows.length} active exams`);

      for (const exam of rows) {
        const roomId = exam.roomId;

        // Skip if already submitted
        if (exam.submitted) {
          console.log(`Skipping submitted exam for ${exam.studentId}`);
          continue;
        }

        // Handle force submit case
        if (exam.force_submit) {
          console.log(
            `Processing force submit for ${exam.studentId}, time left: ${exam.forceSubmitTimeLeft}`
          );

          if (exam.forceSubmitTimeLeft <= 0) {
            console.log(`Force submit time expired for ${exam.studentId}`);

            try {
              // Get current answers
              const [answers] = await db.query(
                `SELECT question_id, selected_option 
                 FROM answers 
                 WHERE Tələbə_kodu = ? AND \`Fənnin kodu\` = ?`,
                [exam.studentId, exam.subjectCode]
              );

              // Calculate score
              let score = 0;
              let totalQuestions = answers.length;

              if (answers.length > 0) {
                const [questions] = await db.query(
                  `SELECT id, correct_option 
                   FROM questions 
                   WHERE id IN (?)`,
                  [answers.map((a) => a.question_id)]
                );

                score = answers.reduce((acc, ans) => {
                  const question = questions.find(
                    (q) => q.id === ans.question_id
                  );
                  return (
                    acc +
                    (question && question.correct_option === ans.selected_option
                      ? 1
                      : 0)
                  );
                }, 0);
              }

              // Update final result
              await db.query(
                `UPDATE results 
                 SET submitted = 1,
                     submitted_at = NOW(),
                     score = ?,
                     total_questions = ?
                 WHERE id = ? AND submitted = 0`,
                [score, totalQuestions, exam.id]
              );

              io.to(roomId).emit("exam_stopped");
              console.log(
                `Force submit completed for ${exam.studentId}, score: ${score}/${totalQuestions}`
              );
            } catch (err) {
              console.error(
                `Error processing force submit completion for ${exam.studentId}:`,
                err
              );
            }
            continue;
          }

          // Notify about remaining force submit time
          io.to(roomId).emit("update_time", {
            timeLeft: exam.forceSubmitTimeLeft,
            isForceSubmit: true,
          });
          continue;
        }

        // Handle normal exam time expiration
        if (exam.timeLeft <= 0) {
          console.log(`Regular exam time expired for ${exam.studentId}`);

          try {
            // Mark as submitted
            await db.query(
              `UPDATE results 
               SET submitted = 1,
                   submitted_at = NOW()
               WHERE id = ? AND submitted = 0`,
              [exam.id]
            );

            // Notify client
            io.to(roomId).emit("force_submit");
            io.to(roomId).emit("exam_stopped");
          } catch (err) {
            console.error(
              `Error processing exam expiration for ${exam.studentId}:`,
              err
            );
          }
          continue;
        }

        // Update normal exam time
        io.to(roomId).emit("update_time", {
          timeLeft: exam.timeLeft,
          isForceSubmit: false,
        });
      }

      // Update admin panel with active students
      const activeStudents = rows
        .filter((exam) => !exam.submitted)
        .map((exam) => ({
          id: exam.studentId,
          subjectCode: exam.subjectCode,
          fullname: exam.fullname,
          subject: exam.subject,
          bonusTime: exam.bonusTime,
          roomId: exam.roomId,
          timeLeft: exam.timeLeft,
          isForceSubmit: exam.force_submit === 1,
        }));

      io.emit("update_active_students", activeStudents);
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
