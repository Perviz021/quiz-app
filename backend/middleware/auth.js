import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import db from "../db.js";

dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
// authenticate
//
// Verifies the JWT signature, then re-reads the user's status from the DB.
// This means even if a user somehow forges a token payload, the DB value
// always wins. Any route using this middleware can trust req.student.status.
// ─────────────────────────────────────────────────────────────────────────────
export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Always fetch fresh status from DB — never trust the token payload's status
    const [users] = await db.query(
      "SELECT * FROM students WHERE `Tələbə_kodu` = ?",
      [decoded.studentId]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = users[0];
    req.student = {
      studentId: user.Tələbə_kodu,
      status:    user.status,                           // from DB, not token
      fullname:  user["Soyadı, adı və ata adı"],
    };

    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Role guards — chain after authenticate()
//
// Usage:  router.get("/admin/...", authenticate, requireStaff, handler)
//         router.get("/teacher/..", authenticate, requireTeacherOrStaff, handler)
//
// These replace the ad-hoc  if (req.student.status !== "staff")  checks
// scattered through individual route files so you only write the guard once.
// ─────────────────────────────────────────────────────────────────────────────

export const requireStaff = (req, res, next) => {
  if (req.student?.status !== "staff") {
    return res.status(403).json({
      error: "Bu əməliyyat yalnız admin tərəfindən edilə bilər",
    });
  }
  next();
};

export const requireTeacher = (req, res, next) => {
  if (req.student?.status !== "teacher") {
    return res.status(403).json({
      error: "Bu əməliyyat yalnız müəllim tərəfindən edilə bilər",
    });
  }
  next();
};

export const requireTeacherOrStaff = (req, res, next) => {
  if (
    req.student?.status !== "teacher" &&
    req.student?.status !== "staff"
  ) {
    return res.status(403).json({
      error: "Bu əməliyyat yalnız müəllim və ya admin tərəfindən edilə bilər",
    });
  }
  next();
};

export const requireStudent = (req, res, next) => {
  if (req.student?.status !== "student") {
    return res.status(403).json({
      error: "Bu əməliyyat yalnız tələbə tərəfindən edilə bilər",
    });
  }
  next();
};
