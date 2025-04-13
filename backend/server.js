import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import questionRoutes from "./routes/questionRoutes.js";
import examRoutes from "./routes/examRoutes.js";
import resultRoutes from "./routes/resultRoutes.js";
import completedExamsRoutes from "./routes/completedExamsRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import examStartRoutes from "./routes/examStartRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", authRoutes);
app.use("/api", subjectRoutes);
app.use("/api", questionRoutes);
app.use("/api", examRoutes);
app.use("/api", resultRoutes);
app.use("/api", completedExamsRoutes);
app.use("/api", reviewRoutes);
app.use("/api", examStartRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
