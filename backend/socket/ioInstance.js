import { Server } from "socket.io";
import db from "../db.js";

let io;

export const initSocket = (server) => {
  if (io) {
    console.log("Socket.IO already initialized");
    return io;
  }

  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 New socket connection:", socket.id);

    socket.on("join_room", (roomId) => {
      console.log(`Socket ${socket.id} joining room:`, roomId);
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room:`, roomId);
    });

    socket.on("join_exam", async ({ roomId }) => {
      if (!roomId) {
        socket.emit("error", "Invalid room ID");
        return;
      }

      // Leave any existing rooms
      const rooms = Array.from(socket.rooms);
      rooms.forEach((room) => {
        if (room !== socket.id) {
          socket.leave(room);
        }
      });

      // Join the new room
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);

      // Notify admin about active students
      updateActiveStudents();
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
      updateActiveStudents();
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

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
