import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid token" });

    req.student = decoded;
    next();
  });
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
