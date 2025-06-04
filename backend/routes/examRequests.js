import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Get exam requests for a student
router.get("/exam-requests", authenticate, async (req, res) => {
  try {
    const studentId = req.student.studentId;
    const [requests] = await db.query(
      `SELECT er.id, er.subject_id as subjectId, er.status, er.created_at as requestTime 
       FROM exam_requests er 
       WHERE er.student_id = ?`,
      [studentId]
    );
    res.json({ requests });
  } catch (error) {
    console.error("Error fetching exam requests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Submit a new exam request
router.post("/request-exam", authenticate, async (req, res) => {
  try {
    const { subjectId } = req.body;
    const studentId = req.student.studentId;

    console.log("subjectId ", subjectId);
    console.log("student ", req.student);

    // Check if request already exists
    const [existing] = await db.query(
      `SELECT id FROM exam_requests 
       WHERE student_id = ? AND subject_id = ? AND status = 'pending'`,
      [studentId, subjectId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Request already exists" });
    }

    // Create new request
    const [result] = await db.query(
      `INSERT INTO exam_requests (student_id, subject_id, status) 
       VALUES (?, ?, 'pending')`,
      [studentId, subjectId]
    );

    // Get student and subject info for notification
    const [studentInfo] = await db.query(
      "SELECT `Soyadı, adı və ata adı` as fullname FROM students WHERE `Tələbə_kodu` = ?",
      [studentId]
    );
    const [subjectInfo] = await db.query(
      "SELECT name FROM subjects WHERE id = ?",
      [subjectId]
    );

    // Emit socket event for new request
    req.app.get("io").emit("new_exam_request", {
      id: result.insertId,
      studentId,
      studentName: studentInfo[0].fullname,
      subjectId,
      subjectName: subjectInfo[0].name,
      requestTime: new Date(),
      status: "pending",
    });

    res.json({ message: "Request submitted successfully" });
  } catch (error) {
    console.error("Error submitting exam request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get pending exam requests for admin
router.get("/pending-exam-requests", authenticate, async (req, res) => {
  try {
    if (req.student.status !== "staff") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const [requests] = await db.query(
      `SELECT er.id, er.student_id, er.subject_id, er.status, er.created_at as requestTime,
              s.\`Soyadı, adı və ata adı\` as studentName, sub.\`Fənnin adı\` as subjectName
       FROM exam_requests er
       JOIN students s ON er.student_id = s.\`Tələbə_kodu\`
       JOIN subjects sub ON er.subject_id = sub.\`Fənn kodu\`
       WHERE er.status = 'pending'
       ORDER BY er.created_at DESC`
    );

    res.json({ requests });
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Handle exam request (approve/reject)
router.post("/handle-exam-request", authenticate, async (req, res) => {
  try {
    if (req.student.status !== "staff") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { requestId, action } = req.body;

    // Get request details
    const [request] = await db.query(
      `SELECT student_id, subject_id FROM exam_requests WHERE id = ?`,
      [requestId]
    );

    if (request.length === 0) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Update request status
    await db.query(`UPDATE exam_requests SET status = ? WHERE id = ?`, [
      action === "approve" ? "approved" : "rejected",
      requestId,
    ]);

    // Emit socket event for request response
    req.app.get("io").emit("exam_request_response", {
      studentId: request[0].student_id,
      subjectId: request[0].subject_id,
      status: action === "approve" ? "approved" : "rejected",
    });

    res.json({
      message: `Request ${
        action === "approve" ? "approved" : "rejected"
      } successfully`,
      studentId: request[0].student_id,
      subjectId: request[0].subject_id,
    });
  } catch (error) {
    console.error("Error handling exam request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
