import express from "express";

const router = express.Router();

// Define routes
router.post("/login", (req, res) => {
  // Login logic here
  res.status(200).send("Login successful");
});

export default router;