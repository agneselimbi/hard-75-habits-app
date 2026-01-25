import request from "supertest";
import express from "express";

import { createMockUser } from "./helpers/testData.js";
import { createMockPrismaClient } from "./helpers/mockPrisma.js";
import { createAuthRoutes } from "../src/routes/authRoutes.js";

describe("User Registration", () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    // Create new express app instance
    app = express();
    app.use(express.json());

    // Create mock  Prisma client
    mockPrisma = createMockPrismaClient();

    // Create auth routes with mock Prisma
    const authRoutes = createAuthRoutes(mockPrisma);
    app.use("/auth", authRoutes);
  });

  it("should return error 409 if user exists already", async () => {
    const newUser = createMockUser({ email: "charlie@hard75.com" });
    mockPrisma.users.findUnique.mockResolvedValue({
      id: 3,
      name: "Charlie",
      email: "charlie@hard75.com",
      password: "test1234",
    });
    const response = await request(app).post("/auth/register").send(newUser);

    expect(response.status).toEqual(409);
    expect(response.body.message).toEqual("Registration failed");
    expect(response.body.errors).toContain(
      "User with this email already exists",
    );
  });

  it("should return error 400 for invalid user data", async () => {
    mockPrisma.users.findUnique.mockResolvedValue(null); //User does not exist
    const invalidUser = createMockUser({
      email: "invalidemail",
      password: "short",
    });
    const response = await request(app)
      .post("/auth/register")
      .send(invalidUser)
      .expect(400);
    expect(response.body.message).toEqual("Validation failed");
    expect(response.body.errors).toContain("Invalid Email");
    expect(response.body.errors).toContain(
      "Password must be at least 6 characters long and contain at least one number",
    );
  });

  it("should register a new user successfully", async () => {
    const newUser = createMockUser({
      name: "Diane",
      email: "diane@hard75.com",
      password: "SecurePass123",
    });
    mockPrisma.users.findUnique.mockResolvedValue(null); // User does not exist

    mockPrisma.users.create.mockResolvedValue({
      id: 8,
      name: "Diane",
      email: "diane@hard75.com",
      password_hash: "hashed_password",
    });

    const response = await request(app)
      .post("/auth/register")
      .send(newUser)
      .expect("Content-Type", /json/);

    // Verify mocks were called
    expect(mockPrisma.users.findUnique).toHaveBeenCalledTimes(1);
    expect(mockPrisma.users.create).toHaveBeenCalledTimes(1);

    expect(response.status).toBe(201);
    expect(response.body.message).toEqual("User registered successfully");
    expect(response.body.user.name).toEqual(newUser.name);
    expect(response.body.user.email).toEqual(newUser.email);
    expect(response.body.user.id).toBeDefined();
  });

  it("should handle database errors gracefully", async () => {
    const newUser = createMockUser();

    // Suppress console.error for this test
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    mockPrisma.users.findUnique.mockResolvedValue(null);
    mockPrisma.users.create.mockRejectedValue(
      new Error("Database connection error"),
    );
    const response = await request(app)
      .post("/auth/register")
      .send(newUser)
      .expect(500);

    expect(response.body.message).toEqual("Internal server error");

    // Restore console.error
    consoleErrorSpy.mockRestore();
  });
});
