import express from "express";
import cors from "cors";

import { createAuthRoutes } from "./routes/authRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/errorHandler.js";
import prisma from "./config/prismaClient.js";

const app = express();
const authRoutes = createAuthRoutes(prisma);
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
app.use("/health", healthRoutes);

//Test route
app.get("/test", (req, res, next) => {
  try {
    // Some async operation
    const err = new Error("UnauthorizedError");
    err.name = "UnauthorizedError";
    err.status = 401;
    throw err;
  } catch (err) {
    next(err); // Pass to error handler
  }
});

app.get("/notfound", (req, res, next) => {
  try {
    // Some async operation that results in not found
    const err = new Error("Not Found");
    err.status = 404;
    throw err;
  } catch (err) {
    next(err); // Pass to error handler
  }
});

// Not found handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;
