import express from "express";
import cors from "cors";
import helmet from "helmet";

import { createAuthRoutes } from "./routes/authRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import { createUserRoutes} from "./routes/protected.js";
import { createChallengeRoutes } from "./routes/protected.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/errorHandler.js";
import prisma from "./config/prismaClient.js";



const app = express();
const authRoutes = createAuthRoutes(prisma);
const userRoutes = createUserRoutes(prisma);
const challengeRoutes = createChallengeRoutes(prisma); 

// Install middleware
app.use(express.json()); // parse json into objects
var corOptions = {
  origin: "*",
  credentials: true,
};
app.use(helmet()); // set secure HTTP headers
app.use(cors(corOptions)); //CORS middleware

// Define routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/challenges", challengeRoutes);

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
    next(err); // Pass to notFound handler
  }
});

// Not found handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;
