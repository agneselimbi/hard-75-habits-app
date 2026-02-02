import express from "express";
import jwt from "jsonwebtoken";

import config from "../config/config.js";
import validateRegistration from "../utils/validationRegistration.js";
import { verifyPassword, hashPassword } from "../utils/password.js";

export function createAuthRoutes(prisma) {
  const router = express.Router();
  // Define routes
  router.post("/login", async (req, res) => {
    try {
    console.log("Login attempt for:", req.body);
    const { email, password } = req.body;
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Login failed",
        errors: ["Email and password are required"]
      });
    }
    // Find user (SINGLE database query)
    console.log("Looking up user:", email);
    const returnedUser = await prisma.users.findUnique({
      where: { email }
    });
    // User not found 
    if (!returnedUser) {
      console.error("User not found:", email);
      return res.status(404).json({
        message: "Login failed",
        errors: ["Invalid credentials"]});
          }

    console.log("User found, verifying password");
    // Verify password
    const passwordMatch = await verifyPassword(password,returnedUser.password);
    if (!passwordMatch) {       
      return  res.status(401).json({
        message: "Login failed",
        errors: ["Incorrect password"],
      });
    }
    // Generate token
    console.log("Generating token for user:", email);
    const token = jwt.sign(
      { id: returnedUser.id,  email: returnedUser.email },
      config.jwt.secret,
      { expiresIn: "1h" }
    );
    // send token as cookie to be saved in the browser
    res.cookie("token", token, {
      httpOnly: true, // prevents JS access (XSS protection)
      secure: config.env === "production", // only send over HTTPS in prod
      sameSite: "strict",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    console.log("Login successful for:", email);
    res.status(200).json({
      message: "Login successful",
      token: token,
    });
    } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Internal server error",
      errors: ["An error occurred during login"],
    });
  }
    });
  
  router.get("/login", (req, res) => {
    res.status(200).json({ message: "Login endpoint is working" });
  });
  router.post("/register", async (req, res) => {
    // Registration logic here
    const user = req.body;
    const errors = [];
    // check if user in database
    const returnedUser = await prisma.users.findUnique({
      where: { email: user.email },
    });
    if (returnedUser) {
      errors.push("User with this email already exists");
      return res.status(409).json({
        message: "Registration failed",
        errors: errors,
      });
    }
    // validate user data
    const validationResult = validateRegistration(user);
    if (!validationResult.valid) {
      errors.push(...validationResult.errors);
      return res.status(400).json({
        message: "Validation failed",
        errors: validationResult.errors,
      });
    }
    // Hash password
    const hashedPassword = await hashPassword(user.password);

    // Register user in database
    try {
      const registeredUser = await prisma.users.create({
        data: {
          name: user.name,
          email: user.email,
          password: hashedPassword,
        },
      });
      console.log("Registered user Id:", registeredUser?.id);
      // Generate token
      const token = jwt.sign(
        { id: registeredUser.id, 
          name: registeredUser.name, 
          email: registeredUser.email 
        },
        config.jwt.secret,
        { expiresIn: "1h" }
      );
      // send token as cookie to be saved in the browser
      res.cookie("token", token, {
        httpOnly: true, // prevents JS access (XSS protection)
        secure: config.env === "production", // only send over HTTPS in prod
        sameSite: "None",
        maxAge: 60 * 60 * 1000, // 1 hour
      });
      return res.status(201).json({
        message: "User registered successfully",
        user: {
          id: registeredUser.id,
          name: user.name,
          email: user.email,
          
        },
        token: token,
      });
    } catch (error) {
      console.error("Error registering user:", error);
      return res.status(500).json({
        message: "Internal server error",
        errors: ["An error occurred while registering the user."],
      });
    }
  });
  return router;
}