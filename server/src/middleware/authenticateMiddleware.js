import jwt from "jsonwebtoken";
import config from "../config/config.js";

export async function authenticateMiddleware(req, res, next) {
  //Extract token from headers
  const authHeader = req.headers.authorization;
  const token =
    (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null) ??
    req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: { message: "No token provided" } });
  }
  try {
    //Verify token validity
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    console.log("Auth Error", error.name);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: { message: "Expired token" } });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: { message: "Invalid token" } });
    }
    return res
      .status(401)
      .json({ error: { message: "Authentication failed" } });
  }
}
