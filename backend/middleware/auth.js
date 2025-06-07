import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import db from "../db.js";

dotenv.config();

export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get the full user data from the database
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
      status: user.status,
      fullname: user["Soyadı, adı və ata adı"],
    };

    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }
};

// export const authorizeAdmin = (req, res, next) => {
//   if (req.user?.status !== "admin") {
//     return res.status(403).json({ error: "Admin access required" });
//   }
//   next();
// };

// export const authorizeStudent = (req, res, next) => {
//   if (req.user?.status !== "student") {
//     return res.status(403).json({ error: "Student access required" });
//   }
//   next();
// };
