import jwt from "jsonwebtoken";
import config from "../config/config.js";

export async function authenticateMiddleware(req, res, next) {
  //Extract token from headers
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: { message: "No token provided" } });
  }
  try {
    //Verify token validity
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    console.log("Error", error.name);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: { message: "Expired token" } });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: { message: "Invalid token" } });
    }
    return res.status(401).json({ error: { message: "Authentication failed" } });
  }
}
