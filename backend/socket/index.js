import { Server } from "socket.io";

export default function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173", // adjust for production
      methods: ["GET", "POST"],
    },
  });

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
