import express from "express";
import multer from "multer";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import db from "../db.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/upload-questions", upload.single("file"), async (req, res) => {
  const { subjectCode } = req.body;
  const filePath = req.file.path;

  console.log(`File uploaded: ${filePath}`);
  console.log(`Request body: ${JSON.stringify(req.body)}`);

  const python = spawn("python", [
    "../backend/scripts/parse_docx.py",
    filePath,
    subjectCode,
  ]);

  let output = "";

  python.stdout.on("data", (data) => {
    output += data.toString();
  });

  python.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });

  python.on("close", (code) => {
    fs.unlinkSync(filePath); // Cleanup uploaded file
    if (code === 0) {
      res.json({ message: "Questions parsed and stored successfully" });
    } else {
      res.status(500).json({ error: "Failed to parse document" });
    }
  });
});

export default router;
