import { Server } from "socket.io";
import { setIO } from "./ioInstance.js"; // ADD THIS

export default function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      // origin: "http://192.168.9.143:3000",
      methods: ["GET", "POST"],
    },
  });

  setIO(io); // SAVE the io instance globally

  io.on("connection", (socket) => {
    console.log("🟢 New socket connected:", socket.id);

    socket.on("join_exam", (studentId) => {
      socket.join(studentId);
      console.log(`Student ${studentId} joined room`);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);
    });
  });

  return io;
}
