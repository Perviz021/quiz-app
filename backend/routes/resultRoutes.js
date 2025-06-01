import express from "express";
import pool from "../db.js"; // Import your MySQL connection
import htmlPdf from "html-pdf-node";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GET /api/results/:studentId
router.get("/results/:studentId", async (req, res) => {
  const { studentId } = req.params;

  try {
    const [results] = await pool.query(
      `SELECT s.\`Fənnin adı\`, r.\`Fənnin kodu\`, r.score, r.created_at, r.submitted_at
        FROM results r
        JOIN subjects s ON r.\`Fənnin kodu\` = s.\`Fənnin kodu\`
        WHERE r.\`Tələbə_kodu\` = ?`,
      [studentId]
    );

    res.json(results);
  } catch (error) {
    console.error("Error fetching results:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/results/group/:fenn_qrupu
router.get("/results/group/:fenn_qrupu", async (req, res) => {
  // Decode the fenn_qrupu from URL
  const fenn_qrupu = decodeURIComponent(req.params.fenn_qrupu);

  try {
    const [results] = await pool.query(
      `SELECT 
        r.id,
        r.\`Tələbə_kodu\`,
        r.\`Fənnin kodu\`,
        r.score,
        r.total_questions,
        r.created_at,
        r.submitted_at,
        r.submitted,
        r.extra_time,
        r.force_submit,
        r.force_submit_time,
        s.\`Soyadı, adı və ata adı\`,
        s.\`Akademik qrup\`,
        sub.\`Fənnin adı\`,
        f.Stable as fenn_qrupu,
        f.\`Pre-Exam\`,
        f.\`Qaib\`,
        f.FA,
        f.teacher_code,
        f.Professor,
        f.Exam_date
      FROM results r
      JOIN students s ON r.\`Tələbə_kodu\` = s.\`Tələbə_kodu\`
      JOIN subjects sub ON r.\`Fənnin kodu\` = sub.\`Fənnin kodu\`
      JOIN ftp f ON r.\`Tələbə_kodu\` = f.\`Tələbə_kodu\` AND r.\`Fənnin kodu\` = f.\`Fənnin kodu\`
      WHERE f.Stable LIKE ?
      ORDER BY r.submitted_at DESC`,
      [`${fenn_qrupu}%`]
    );

    res.json(results);
  } catch (error) {
    console.error("Error fetching group results:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/results/group/:fenn_qrupu/download
router.get("/results/group/:fenn_qrupu/download", async (req, res) => {
  const fenn_qrupu = decodeURIComponent(req.params.fenn_qrupu);

  try {
    const [results] = await pool.query(
      `SELECT 
        r.id,
        r.\`Tələbə_kodu\`,
        r.\`Fənnin kodu\`,
        r.score,
        r.total_questions,
        r.created_at,
        r.submitted_at,
        r.submitted,
        r.extra_time,
        r.force_submit,
        r.force_submit_time,
        s.\`Soyadı, adı və ata adı\`,
        s.\`Akademik qrup\`,
        sub.\`Fənnin adı\`,
        f.Stable as fenn_qrupu
      FROM results r
      JOIN students s ON r.\`Tələbə_kodu\` = s.\`Tələbə_kodu\`
      JOIN subjects sub ON r.\`Fənnin kodu\` = sub.\`Fənnin kodu\`
      JOIN ftp f ON r.\`Tələbə_kodu\` = f.\`Tələbə_kodu\` AND r.\`Fənnin kodu\` = f.\`Fənnin kodu\`
      WHERE f.Stable = ?
      ORDER BY r.submitted_at DESC`,
      [fenn_qrupu]
    );

    // Create HTML content
    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #4f46e5; color: white; }
            h1, h2 { text-align: center; }
          </style>
        </head>
        <body>
          <h1>İmtahan Nəticələri</h1>
          <h2>Fənn Qrupu: ${fenn_qrupu}</h2>
          <table>
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th>Fənn</th>
                <th>Bal</th>
                <th>Tarix</th>
                <th>Akademik Qrup</th>
              </tr>
            </thead>
            <tbody>
              ${results
                .map(
                  (result) => `
                <tr>
                  <td>${result["Soyadı, adı və ata adı"]}</td>
                  <td>${result["Fənnin adı"]}</td>
                  <td>${result.score}</td>
                  <td>${new Date(result.submitted_at).toLocaleString("en-GB", {
                    year: "numeric",
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  })}</td>
                  <td>${result["Akademik qrup"]}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    // Generate PDF
    const options = { format: "A4" };
    const file = { content: htmlContent };

    htmlPdf
      .generatePdf(file, options)
      .then((pdfBuffer) => {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=results_${fenn_qrupu.replace("/", "_")}.pdf`
        );
        res.send(pdfBuffer);
      })
      .catch((error) => {
        console.error("Error generating PDF:", error);
        res.status(500).json({ error: "Failed to generate PDF" });
      });
  } catch (error) {
    console.error("Error fetching results:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/results/groups/:fenn_qrupu
router.get("/results/groups/:fenn_qrupu", async (req, res) => {
  const fenn_qrupu = decodeURIComponent(req.params.fenn_qrupu);

  try {
    const [groups] = await pool.query(
      `SELECT DISTINCT f.Stable as fenn_qrupu, 
              sub.\`Fənnin adı\`,
              f.Professor,
              f.Exam_date
       FROM ftp f
       JOIN subjects sub ON f.\`Fənnin kodu\` = sub.\`Fənnin kodu\`
       JOIN results r ON f.\`Tələbə_kodu\` = r.\`Tələbə_kodu\` AND f.\`Fənnin kodu\` = r.\`Fənnin kodu\`
       WHERE f.Stable LIKE ?
       ORDER BY f.Stable`,
      [`${fenn_qrupu}%`]
    );

    res.json(groups);
  } catch (error) {
    console.error("Error fetching fenn groups:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/results/update
router.post("/results/update", async (req, res) => {
  const { results } = req.body;

  try {
    // Start a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Update each result
      for (const { id, score } of results) {
        await connection.query("UPDATE results SET score = ? WHERE id = ?", [
          score,
          id,
        ]);
      }

      // Commit the transaction
      await connection.commit();
      res.json({ message: "Results updated successfully" });
    } catch (error) {
      // If there's an error, rollback the transaction
      await connection.rollback();
      throw error;
    } finally {
      // Release the connection
      connection.release();
    }
  } catch (error) {
    console.error("Error updating results:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/results/export-excel-python
router.post("/results/export-excel-python", async (req, res) => {
  const protocolData = {
    students: Array.isArray(req.body) ? req.body : req.body.students || [],
    // Optionally, add other header fields if needed
    ...(!Array.isArray(req.body) ? req.body : {}),
  };

  // Log the data sent to Python for debugging
  console.log("Export protocolData:", JSON.stringify(protocolData, null, 2));

  // Path to the Python script
  const pythonScriptPath = path.join(
    __dirname,
    "../scripts/generate_protocol_excel.py"
  );
  // Path to the Excel template (relative to the Python script)
  const templatePath = path.join(__dirname, "../templates/ProtocolForm.xlsx");

  // Check if template exists
  if (!fs.existsSync(templatePath)) {
    console.error(`Error: Template file not found at ${templatePath}`);
    return res
      .status(500)
      .json({ error: "Excel template not found on server." });
  }

  // Spawn the Python process with UTF-8 encoding
  const pythonProcess = spawn("python", [pythonScriptPath], {
    stdio: ["pipe", "pipe", "pipe"], // Use pipes for stdin, stdout, stderr
    encoding: "utf8",
  });

  let outputData = ""; // To capture both path and filename
  let errorOutput = "";

  // Send data to Python script via stdin
  pythonProcess.stdin.write(JSON.stringify(protocolData), "utf8");
  pythonProcess.stdin.end();

  // Capture stdout from Python script (should be file path and filename, each on a new line)
  pythonProcess.stdout.on("data", (data) => {
    outputData += data.toString("utf8"); // Read as UTF-8
  });

  // Capture stderr from Python script
  pythonProcess.stderr.on("data", (data) => {
    errorOutput += data.toString("utf8"); // Read as UTF-8
    console.error(`Python script stderr: ${data.toString("utf8").trim()}`);
  });

  // Handle Python process exit
  pythonProcess.on("close", (code) => {
    if (code === 0 && outputData) {
      // Split the output data to get path and filename
      const [outputFilePath, filename] = outputData
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line);

      if (outputFilePath && filename) {
        // Python script succeeded, send the generated file
        res.setHeader(
          "Content-Disposition",
          `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
        );
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8"
        );
        res.sendFile(outputFilePath, (err) => {
          if (err) {
            console.error("Error sending file:", err);
          }
          // Clean up the temporary file
          fs.unlink(outputFilePath, (unlinkErr) => {
            if (unlinkErr) {
              console.error("Error deleting temp file:", unlinkErr);
            }
          });
        });
      } else {
        console.error(
          `Python script output format error. Expected path and filename, got:\n${outputData}`
        );
        res.status(500).json({
          error: "Failed to generate Excel file.",
          details: `Python script output format error.`,
        });
      }
    } else {
      // Python script failed
      console.error(
        `Python script exited with code ${code}. Error output:\n${errorOutput}`
      );
      res.status(500).json({
        error: "Failed to generate Excel file.",
        details: errorOutput,
      });
    }
  });

  // Handle process spawn errors
  pythonProcess.on("error", (err) => {
    console.error("Failed to start Python process:", err);
    res.status(500).json({
      error: "Failed to execute Excel generation script.",
      details: err.message,
    });
  });
});

export default router;
