import express from "express";

import validateRegistration from "../utils/validationRegistration.js";
import validateUser from "../utils/validateUser.js";
import { verifyPassword, hashPassword } from "../utils/password.js";

export function createAuthRoutes(prisma) {
  const router = express.Router();
 
  // Define routes
  router.post("/login", (req, res) => {
    // Login logic here
    res.status(200).send("Login successful");
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
      return res.status(201).json({
        message: "User registered successfully",
        user: {
          id: registeredUser.id,
          name: user.name,
          email: user.email,
        },
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
