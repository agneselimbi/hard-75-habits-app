import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import e from "express";

const app = express();

// Install middleware
app.use(express.json()); // parse json into objects
var corOptions = {
  origin: "*",
  credentials: true,
};
app.use(cors(corOptions)); //CORS middleware

// Define routes
app.use("/auth", authRoutes);

// Health check route
app.get("/", (req, res) => {
  res.status(200).send("Health Point Check");
});

export default app;
