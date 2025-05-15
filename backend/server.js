import express from "express";
import cors from "cors";
import { createServer } from "http";
import { initializeSocket } from "./socket/index.js";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import questionRoutes from "./routes/questionRoutes.js";
import resultRoutes from "./routes/resultRoutes.js";
import completedExamsRoutes from "./routes/completedExamsRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import examStartRoutes from "./routes/examStartRoutes.js";
import adminExamControlRoutes from "./routes/adminExamControl.js";
import uploadQuestionRoutes from "./routes/uploadQuestionRoutes.js";
import addQuestion from "./routes/addQuestion.js";
import examSubmission from "./routes/examSubmission.js";

const app = express();
const server = createServer(app);

// Initialize Socket.IO
initializeSocket(server);

// Middleware
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(
  "/api/uploads/students",
  express.static(path.join(__dirname, "uploads/students"))
);

// Routes
app.use("/api", authRoutes);
app.use("/api", subjectRoutes);
app.use("/api", questionRoutes);
app.use("/api", resultRoutes);
app.use("/api", completedExamsRoutes);
app.use("/api", reviewRoutes);
app.use("/api", examStartRoutes);
app.use("/api", adminExamControlRoutes);
app.use("/api", uploadQuestionRoutes);
app.use("/api", addQuestion);
app.use("/api", examSubmission);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
