import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import setupSocketServer from "./socket/index.js";

import authRoutes from "./routes/authRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import questionRoutes from "./routes/questionRoutes.js";
import examRoutes from "./routes/examRoutes.js";
import resultRoutes from "./routes/resultRoutes.js";
import completedExamsRoutes from "./routes/completedExamsRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import examStartRoutes from "./routes/examStartRoutes.js";
import adminExamControl from "./routes/adminExamControl.js";
import uploadQuestionRoutes from "./routes/uploadQuestionRoutes.js";
import addQuestion from "./routes/addQuestion.js";

const app = express();
const server = http.createServer(app); // 🆕 create HTTP server

setupSocketServer(server); // 🆕 initialize WebSocket

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads/students", express.static(path.join(__dirname, "uploads")));

app.use("/api", authRoutes);
app.use("/api", subjectRoutes);
app.use("/api", questionRoutes);
app.use("/api", examRoutes);
app.use("/api", resultRoutes);
app.use("/api", completedExamsRoutes);
app.use("/api", reviewRoutes);
app.use("/api", examStartRoutes);
app.use("/api", adminExamControl);
app.use("/api", uploadQuestionRoutes);
app.use("/api", addQuestion);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
