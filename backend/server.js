import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

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

const app = express();
app.use(cors());
app.use(express.json());

// __dirname ES module üçün
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Yüklənmiş şəkilləri serve etmək üçün:
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API route-lar
app.use("/api", authRoutes);
app.use("/api", subjectRoutes);
app.use("/api", questionRoutes);
app.use("/api", examRoutes);
app.use("/api", resultRoutes);
app.use("/api", completedExamsRoutes);
app.use("/api", reviewRoutes);
app.use("/api", examStartRoutes);
app.use("/api", adminExamControl); // Admin exam control routes
app.use("/api", uploadQuestionRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
