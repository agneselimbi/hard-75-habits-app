import express from "express";
import request from "supertest";
import { Prisma } from "@prisma/client";

import app from "../src/app.js";
import { createChallengeRoutes } from "../src/routes/challengeRoutes.js";
import { createUserRoutes } from "../src/routes/userRoutes.js";
import { createAuthRoutes } from "../src/routes/authRoutes.js";
import { createMockPrismaClient } from "./helpers/mockPrisma.js";
import { createMockUser } from "./helpers/testData.js";

describe("Validating list challenges route", () => {
  it("should return 401 without token", async () => {
    const response = await request(app).get("/challenges/list");
    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe("No token provided");
  });
  it("should return 401 with invalid token", async () => {
    const response = await request(app)
      .get("/challenges/list")
      .set("Authorization", "Bearer invalidtoken");
    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe("Invalid token");
  });
  it("should return 200 for existing user", async () => {
    const loginResponse = await request(app)
      .post("/auth/login")
      .send({ email: "charlie@hard75.com", password: "test1234" });
    const token = loginResponse.body.token;
    expect(token).toBeDefined();
    const response = await request(app)
      .get("/challenges/list")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  }, 10000);
  it("should not return sensitive data", async () => {
    // Login with valid credentials
    const loginResponse = await request(app)
      .post("/auth/login")
      .send({ email: "bob@hard75.com", password: "test1234" });
    const token = loginResponse.body.token;
    expect(token).toBeDefined();
    const response = await request(app)
      .get("/challenges/list")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(
      response.body.data.every((challenge) => !("password" in challenge)),
    ).toBe(true);
  });
  it("should return data specific to the authenticated user", async () => {
    // Login with valid credentials
    const loginResponse = await request(app)
      .post("/auth/login")
      .send({ email: "bob@hard75.com", password: "test1234" });
    const token = loginResponse.body.token;

    const returnedUser = await request(app)
      .get("/users/profile")
      .set("Authorization", `Bearer ${token}`);
    expect(returnedUser.body.user.id).toBeDefined();
    const userId = returnedUser.body.user.id;
    expect(token).toBeDefined();
    const response = await request(app)
      .get("/challenges/list")
      .set("Authorization", `Bearer ${token}`);
    console.log("Challenges response body:", response.body);
    expect(
      response.body.data.every((challenge) => challenge.user_id === userId),
    ).toBe(true);
  });
});

describe("Validating create challenges route", () => {
  let mockapp;
  let mockPrisma;
  let token;
  let userId;
  let challenge_id;
  beforeAll(async () => {
    mockapp = express();
    mockPrisma = createMockPrismaClient();
    const authRoutes = createAuthRoutes(mockPrisma);
    const challengeRoutes = createChallengeRoutes(mockPrisma);
    const userRoutes = createUserRoutes(mockPrisma); // Import this

    mockapp.use(express.json()); // parse json into objects
    mockapp.use("/auth", authRoutes);
    mockapp.use("/users", userRoutes);
    mockapp.use("/challenges", challengeRoutes);

    // Mock user for both login and profile
    mockPrisma.users.findUnique.mockResolvedValue({
      email: "alice@hard75.com",
      password: "$2b$10$5S.IAkN8GcDG543HHHjW/O.Bh3nTf10Y/kIljDZzG7j6Nl65bk0t.",
      id: 1,
      name: "Alice",
    });

    // Login user
    const loginResp = await request(mockapp)
      .post("/auth/login")
      .send({ email: "alice@hard75.com", password: "test1234" });

    token = loginResp.body.token;

    // Collect user information
    const returnedUser = await request(mockapp)
      .get("/users/profile")
      .set("Authorization", `Bearer ${token}`);

    userId = returnedUser.body.user.id;
    expect(userId).toBeDefined();
  });
  it("should return 201 if challenge created with appropriate data", async () => {
    mockPrisma.challenges.create.mockResolvedValue({
      challenge_name: "Test challenge",
      total_habits: 4,
      id: 5,
      user_id: 1,
      start_date: new Date(),
      current_day: 1,
    });
    const response = await request(mockapp)
      .post("/challenges/create")
      .set("Authorization", `Bearer ${token}`)
      .send({ challenge_name: "Test challenge", total_habits: 4 });

    expect(mockPrisma.challenges.create).toHaveBeenCalledWith({
      data: {
        challenge_name: "Test challenge",
        total_habits: 4,
        challenge_owner: {
          connect: { id: userId },
        },
      },
    });
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      id: expect.any(Number),
      challenge_name: "Test challenge",
      total_habits: 4,
      user_id: userId,
    });
  });

  it("should throw error if total habits is absent", async () => {
    mockPrisma.challenges.findFirst.mockResolvedValue(null);
    const response = await request(mockapp)
      .post("/challenges/create")
      .set("Authorization", `Bearer ${token}`)
      .send({ challenge_name: "Test challenge", total_habits: "" });
    expect(response.body.error.message).toBe(
      "Challenge Name and Total Habits are required",
    );
    expect(response.status).toBe(400);
  });

  it("should have total habits > 1", async () => {
    const response = await request(mockapp)
      .post("/challenges/create")
      .set("Authorization", `Bearer ${token}`)
      .send({ challenge_name: "Test challenge", user_id: 3, total_habits: -1 });
    expect(response.body.error.message).toBe(
      "Total habits should be between 1 and 10",
    );
  });
  it("should have total habits < 10", async () => {
    const response = await request(mockapp)
      .post("/challenges/create")
      .set("Authorization", `Bearer ${token}`)
      .send({ challenge_name: "Test challenge", user_id: 3, total_habits: 11 });
    expect(response.body.error.message).toBe(
      "Total habits should be between 1 and 10",
    );
  });

  it.skip("challenge should appear in database after creation", async () => {
    // Login user in the mock application
    const loginResponse = await request(app)
      .post("/auth/login")
      .send({ email: "charlie@hard75.com", password: "test1234" });
    const token1 = loginResponse.body.token;
    const returnedUser = await request(app)
      .get("/users/profile")
      .set("Authorization", `Bearer ${token1}`);
    expect(returnedUser.body.user.id).toBeDefined();
    const userId = returnedUser.body.user.id;
    console.log("userId", userId);

    // Create test challenge
    // const createdChallenge = await request(app).post("/challenges/create").set('Authorization', `Bearer ${token1}`).send({challenge_name: "Test Challenge", total_habits:4});
    const response = await request(app)
      .get("/challenges/list")
      .set("Authorization", `Bearer ${token1}`);

    const testChallenge = response.body.data.find(
      (challenge) =>
        challenge.challenge_name === "Test Challenge" &&
        challenge.user_id === userId &&
        challenge.status === "active",
    );
    console.log(testChallenge);
    expect(testChallenge).toBeDefined();
    expect(testChallenge).toMatchObject({
      id: expect.any(Number),
      challenge_name: "Test Challenge",
      total_habits: 4,
      user_id: userId,
      status: "active",
    });
  });

  it("should return 409 if user has existing active challenge", async () => {
    mockPrisma.challenges.findFirst.mockResolvedValue({
      id: 1,
      challenge_name: "alice's challenge",
      total_habits: 4,
      status: "active",
      user_id: 1,
    });
    const challenge = { challenge_name: "Test challenge", total_habits: 5 };
    const response = await request(mockapp)
      .post("/challenges/create")
      .set("Authorization", `Bearer ${token}`)
      .send(challenge);
    expect(response.body.error.message).toBe(
      `User with id 1 is already participating in a challenge`,
    );
  });

  it("should throw error if totalHabits is non Numeric", async () => {
    mockPrisma.challenges.findFirst.mockResolvedValue(null);
    const response = await request(mockapp)
      .post("/challenges/create")
      .set("Authorization", `Bearer ${token}`)
      .send({
        challenge_name: "Test challenge",
        user_id: 3,
        total_habits: "five",
      });
    expect(response.body.error.message).toBe(
      "total Habits should be an integer",
    );
    expect(response.status).toBe(400);
  });
  it("should throw error if challenge name is absent", async () => {
    mockPrisma.challenges.findFirst.mockResolvedValue(null);
    const response = await request(mockapp)
      .post("/challenges/create")
      .set("Authorization", `Bearer ${token}`)
      .send({ challenge_name: null, user_id: 3, total_habits: 5 });
    expect(response.body.error.message).toBe(
      "Challenge Name and Total Habits are required",
    );
    expect(response.status).toBe(400);
  });

  it("should handle db errors gracefullly", async () => {
    // Mock Prisma in Challenge routes
    mockPrisma.challenges.findFirst.mockResolvedValue(null);
    mockPrisma.challenges.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Connection lost", {
        code: "P1001",
        clientVersion: "5.0.0",
      }),
    );
    const response = await request(mockapp)
      .post("/challenges/create")
      .set("Authorization", `Bearer ${token}`)
      .send({ challenge_name: "Test challenge", user_id: 3, total_habits: 5 });
    expect(response.body.error.message).toBe("Unable to create new challenge");
  });
});

describe("Validating get challenge/:id routes", () => {
  let mockapp;
  let mockPrisma;
  let token;
  let userId;
  beforeAll(async () => {
    mockapp = express();
    mockPrisma = createMockPrismaClient();
    const authRoutes = createAuthRoutes(mockPrisma);
    const challengeRoutes = createChallengeRoutes(mockPrisma);
    const userRoutes = createUserRoutes(mockPrisma);
    mockapp.use(express.json()); // parse json into objects
    mockapp.use("/auth", authRoutes);
    mockapp.use("/users", userRoutes);
    mockapp.use("/challenges", challengeRoutes);

    // Mock user for both login and profile
    mockPrisma.users.findUnique.mockResolvedValue({
      email: "alice@hard75.com",
      password: "$2b$10$5S.IAkN8GcDG543HHHjW/O.Bh3nTf10Y/kIljDZzG7j6Nl65bk0t.",
      id: 1,
      name: "Alice",
    });

    // Login user
    const loginResp = await request(mockapp)
      .post("/auth/login")
      .send({ email: "alice@hard75.com", password: "test1234" });

    token = loginResp.body.token;

    // Collect user information
    const returnedUser = await request(mockapp)
      .get("/users/profile")
      .set("Authorization", `Bearer ${token}`);

    userId = returnedUser.body.user.id;
    expect(userId).toBeDefined();
  });

  it("should return 400 if the user input is not integer", async () => {
    const response = await request(mockapp)
      .get("/challenges/'five'")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe(
      `Need to provide a valid challenge id`,
    );
  });

  it("user should only have access to their data", async () => {
    mockPrisma.challenges.findFirst.mockResolvedValue({
      id: 1,
      challenge_name: "Test challenge",
      total_habits: 5,
      user_id: userId,
      status: "failed",
      current_day: 45,
      challenge_habits: [
        { habit_name: "habit 1", habit_order: 1 },
        { habit_name: "habit 2", habit_order: 2 },
      ],
    });
    const response = await request(mockapp)
      .get("/challenges/1")
      .set("Authorization", `Bearer ${token}`);
    console.log(response.body);
    expect(response.status).toBe(200);
    expect(mockPrisma.challenges.findFirst).toHaveBeenCalledWith({
      where: {
        id: 1,
      },
      include: {
        challenge_habits: {
          select: {
            habit_name: true,
            habit_order: true,
          },
          orderBy: {
            habit_order: "desc",
          },
        },
      },
    });
  });

  it("should return 403 if user is trying to accces challenges that don't belong to them", async () => {
    mockPrisma.challenges.findFirst.mockResolvedValue({
      id: 1,
      challenge_name: "Test challenge",
      total_habits: 5,
      user_id: 67,
      status: "failed",
      current_day: 45,
      challenge_habits: [
        { habit_name: "habit 1", habit_order: 1 },
        { habit_name: "habit 2", habit_order: 2 },
      ],
    });
    const response = await request(mockapp)
      .get("/challenges/1")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(403);
    console.log(response.body);
    expect(response.body.error.message).toBe(
      "User is not authorized to access given challenge data",
    );
  });

  it("should return 404 if challenge is not existing", async () => {
    mockPrisma.challenges.findFirst.mockResolvedValue(null);
    const response = await request(mockapp)
      .get("/challenges/100")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe("Challenge not found");
  });
});

describe("Validating post challenge/:id/habits routes", () => {
  let mockapp;
  let mockPrisma;
  let token;
  let userId;
  beforeAll(async () => {
    mockapp = express();
    mockPrisma = createMockPrismaClient();
    const authRoutes = createAuthRoutes(mockPrisma);
    const challengeRoutes = createChallengeRoutes(mockPrisma);
    const userRoutes = createUserRoutes(mockPrisma);
    mockapp.use(express.json()); // parse json into objects
    mockapp.use("/auth", authRoutes);
    mockapp.use("/users", userRoutes);
    mockapp.use("/challenges", challengeRoutes);

    // Mock user for both login and profile
    mockPrisma.users.findUnique.mockResolvedValue({
      email: "alice@hard75.com",
      password: "$2b$10$5S.IAkN8GcDG543HHHjW/O.Bh3nTf10Y/kIljDZzG7j6Nl65bk0t.",
      id: 1,
      name: "Alice",
    });

    // Login user
    const loginResp = await request(mockapp)
      .post("/auth/login")
      .send({ email: "alice@hard75.com", password: "test1234" });

    token = loginResp.body.token;

    // Collect user information
    const returnedUser = await request(mockapp)
      .get("/users/profile")
      .set("Authorization", `Bearer ${token}`);

    userId = returnedUser.body.user.id;
    expect(userId).toBeDefined();
  });

  // **Success Cases**:
  // 1. Successfully adds correct number of habits
  // 2. Habits have sequential order (1, 2, 3, 4, 5)
  // 3. Habits linked to correct challenge
  // 4. Returns all created habits
  // 5. Can retrieve habits from GET /api/challenges/:id

  it("should successfully add correct number of habits", async () => {
    // Create Challenge
    const challengeId = 1;
    mockPrisma.challenges.findFirst.mockResolvedValue({
      id: challengeId,
      challenge_name: "Test challenge",
      user_id: userId,
      total_habits: 3,
      current_day: 1,
      status: "active",
      challenge_habits: [
        { habit_name: "Test Habit 1", habit_order: 1 },
        { habit_name: "Test Habit 2", habit_order: 2 },
        { habit_name: "Test Habit 3", habit_order: 3 },
      ],
    });
    mockPrisma.challenge_habits.findMany.mockResolvedValue(null);
    mockPrisma.challenge_habits.createMany.mockResolvedValue([
      {
        id: 10,
        challenge_id: challengeId,
        habit_name: "Test Habit 1",
        habit_order: 1,
      },
      {
        id: 11,
        challenge_id: challengeId,
        habit_name: "Test Habit 2",
        habit_order: 2,
      },
      {
        id: 12,
        challenge_id: challengeId,
        habit_name: "Test Habit 3",
        habit_order: 3,
      },
    ]);
    const habits = await request(mockapp)
      .post(`/challenges/${challengeId}/habits`)
      .set("Authorization", `Bearer ${token}`)
      .send([
        {
          challenge_id: challengeId,
          habit_name: "Test Habit 1",
          habit_order: 1,
        },
        {
          challenge_id: challengeId,
          habit_name: "Test Habit 2",
          habit_order: 2,
        },
        {
          challenge_id: challengeId,
          habit_name: "Test Habit 3",
          habit_order: 3,
        },
      ]);
    const data = habits.body.data;
    expect(data.length).toBe(3);
    expect(data[0].habit_order).toBe(1);
    expect(data[1].habit_order).toBe(2);
    expect(data[2].habit_order).toBe(3);
    expect(data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(Number),
          habit_name: "Test Habit 1",
          habit_order: 1,
          challenge_id: 1,
        }),
        expect.objectContaining({
          id: expect.any(Number),
          habit_name: "Test Habit 2",
          habit_order: 2,
          challenge_id: 1,
        }),
        expect.objectContaining({
          id: expect.any(Number),
          habit_name: "Test Habit 3",
          habit_order: 3,
          challenge_id: 1,
        }),
      ]),
    );

    expect(data[0].challenge_id).toBe(challengeId);
  });
  it("should reject if challenge belongs to another user (403)", async () => {
    mockPrisma.challenges.findFirst.mockResolvedValue({
      id: 1,
      challenge_name: "Test challenge",
      user_id: 2,
      total_habits: 3,
      current_day: 1,
      status: "active",
    });
    mockPrisma.challenge_habits.findMany.mockResolvedValue(null);
    const response = await request(mockapp)
      .post("/challenges/1/habits")
      .set("Authorization", `Bearer ${token}`)
      .send([
        { challenge_id: 1, habit_name: "Test Habit 1", habit_order: 1 },
        { challenge_id: 1, habit_name: "Test Habit 2", habit_order: 2 },
        { challenge_id: 1, habit_name: "Test Habit 3", habit_order: 3 },
      ]);

    expect(response.status).toBe(403);
    expect(response.body.error.message).toBe(
      "User is not authorized to access given challenge data",
    );
  });
  it("should reject unauthenticated requests (401)", async () => {
    mockPrisma.challenges.findFirst.mockResolvedValue({
      id: 1,
      challenge_name: "Test challenge",
      user_id: 2,
      total_habits: 3,
      current_day: 1,
      status: "active",
    });
    const response = await request(mockapp)
      .post("/challenges/1/habits")
      .send([
        { challenge_id: 1, habit_name: "Test Habit 1", habit_order: 1 },
        { challenge_id: 1, habit_name: "Test Habit 2", habit_order: 2 },
        { challenge_id: 1, habit_name: "Test Habit 3", habit_order: 3 },
      ]);
    expect(response.status).toBe(401);
  });
  it("should reject if challenge doesn't exist (404)", async () => {
    const challengeId = 999;
    mockPrisma.challenges.findFirst.mockResolvedValue(null);
    const response = await request(mockapp)
      .post(`/challenges/${challengeId}/habits`)
      .set("Authorization", `Bearer ${token}`)
      .send([
        {
          challenge_id: challengeId,
          habit_name: "Test Habit 1",
          habit_order: 1,
        },
        {
          challenge_id: challengeId,
          habit_name: "Test Habit 2",
          habit_order: 2,
        },
        {
          challenge_id: challengeId,
          habit_name: "Test Habit 3",
          habit_order: 3,
        },
      ]);

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe("Challenge not found");
  });
  it("should reject if wrong number of habits provided", async () => {
    mockPrisma.challenges.findFirst.mockResolvedValue({
      id: 1,
      challenge_name: "Test challenge",
      user_id: userId,
      total_habits: 4,
      current_day: 1,
      status: "active",
    });

    const response = await request(mockapp)
      .post("/challenges/1/habits")
      .set("Authorization", `Bearer ${token}`)
      .send([
        { challenge_id: 1, habit_name: "Test Habit 1", habit_order: 1 },
        { challenge_id: 1, habit_name: "Test Habit 2", habit_order: 2 },
        { challenge_id: 1, habit_name: "Test Habit 3", habit_order: 3 },
      ]);
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe(
      "Habits provided do not match the total habits from the challenge",
    );
  });
  it("should reject if habits already added", async () => {
    mockPrisma.challenges.findFirst.mockResolvedValue({
      id: 1,
      challenge_name: "Test challenge",
      user_id: userId,
      total_habits: 3,
      current_day: 1,
      status: "active",
    });
    mockPrisma.challenge_habits.findMany.mockResolvedValue([
      { id: 11, challenge_id: 1, habit_name: "Test Habit 1", habit_order: 1 },
    ]);

    const response = await request(mockapp)
      .post("/challenges/1/habits")
      .set("Authorization", `Bearer ${token}`)
      .send([
        { challenge_id: 1, habit_name: "Test Habit 1", habit_order: 1 },
        { challenge_id: 1, habit_name: "Test Habit 2", habit_order: 2 },
        { challenge_id: 1, habit_name: "Test Habit 3", habit_order: 3 },
      ]);
    expect(response.status).toBe(409);
    expect(response.body.error.message).toBe(
      "Habits already added to the challenge",
    );
  });
  it("should reject if challenge not active", async () => {
    mockPrisma.challenges.findFirst.mockResolvedValue({
      id: 1,
      challenge_name: "Test challenge",
      user_id: userId,
      total_habits: 3,
      current_day: 1,
      status: "completed",
    });
    mockPrisma.challenge_habits.findMany.mockResolvedValue(null);
    const response = await request(mockapp)
      .post("/challenges/1/habits")
      .set("Authorization", `Bearer ${token}`)
      .send([
        { challenge_id: 1, habit_name: "Test Habit 1", habit_order: 1 },
        { challenge_id: 1, habit_name: "Test Habit 2", habit_order: 2 },
        { challenge_id: 1, habit_name: "Test Habit 3", habit_order: 3 },
      ]);
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe(
      "Can't add habits to inactive challenges",
    );
  });
  it("should reject if empty habit Names", async () => {
    const response = await request(mockapp)
      .post("/challenges/1/habits")
      .set("Authorization", `Bearer ${token}`)
      .send([
        { challenge_id: 1, habit_name: null, habit_order: 1 },
        { challenge_id: 1, habit_name: "Test Habit 2", habit_order: 2 },
        { challenge_id: 1, habit_name: "Test Habit 3", habit_order: 3 },
      ]);
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe(
      "Missing or empty habit name found",
    );
  });

  it("should reject empty habits array", async () => {
    const response = await request(mockapp)
      .post("/challenges/1/habits")
      .set("Authorization", `Bearer ${token}`)
      .send([]);
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe(
      "Need to provide habits for the challenge",
    );
  });
});

describe("Validating put /:challengeId/habits/:habitId routes", () => {
  let mockapp;
  let mockPrisma;
  let token;
  let userId;
  beforeAll(async () => {
    mockapp = express();
    mockPrisma = createMockPrismaClient();
    const authRoutes = createAuthRoutes(mockPrisma);
    const challengeRoutes = createChallengeRoutes(mockPrisma);
    const userRoutes = createUserRoutes(mockPrisma);
    mockapp.use(express.json()); // parse json into objects
    mockapp.use("/auth", authRoutes);
    mockapp.use("/users", userRoutes);
    mockapp.use("/challenges", challengeRoutes);

    // Mock user for both login and profile
    mockPrisma.users.findUnique.mockResolvedValue({
      email: "alice@hard75.com",
      password: "$2b$10$5S.IAkN8GcDG543HHHjW/O.Bh3nTf10Y/kIljDZzG7j6Nl65bk0t.",
      id: 1,
      name: "Alice",
    });

    // Login user
    const loginResp = await request(mockapp)
      .post("/auth/login")
      .send({ email: "alice@hard75.com", password: "test1234" });

    token = loginResp.body.token;

    // Collect user information
    const returnedUser = await request(mockapp)
      .get("/users/profile")
      .set("Authorization", `Bearer ${token}`);

    userId = returnedUser.body.user.id;
    expect(userId).toBeDefined();
  });

  it("should return 400 if challengeId is invalid", async () => {
    const response = await request(mockapp)
      .put("/challenges/'1'/habits/12")
      .set("Authorization", `Bearer ${token}`)
      .send({ habit_name: "updated Habit" });
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe(
      `Need to provide a valid challenge id`,
    );
  });
  it("should return 400 if habitId is invalid", async () => {
    const response = await request(mockapp)
      .put("/challenges/1/habits/twelve")
      .set("Authorization", `Bearer ${token}`)
      .send({ habit_name: "updated Habit" });
    expect(response.status).toBe(400);

    expect(response.body.error.message).toBe(
      "Need to provide a valid habit id",
    );
  });
  it("should return 400 if no habit is provided", async () => {
    const response = await await request(mockapp)
      .put("/challenges/1/habits/12")
      .set("Authorization", `Bearer ${token}`)
      .send({});
    console.log(response.body);
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe(
      "Need to provide a valid habit name",
    );
  });
  it("should return 404 if the challenge/habit is non existent", async () => {
    mockPrisma.challenges.findFirst.mockResolvedValue(null);
    const response = await request(mockapp)
      .put("/challenges/1/habits/3")
      .set("Authorization", `Bearer ${token}`)
      .send({ habit_name: "updated_habit" });
    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe("Habit not found");
  });
  it("should return 403 if the habit belongs to a different user", async () => {
    mockPrisma.challenges.findFirst.mockResolvedValue({
      id: 1,
      challenge_name: "Test challenge",
      user_id: 12,
      current_day: 1,
      total_habits: 3,
      challenge_habits: [
        {
          habit_name: "Habit 3",
          habit_order: 3,
        },
      ],
    });
    await request(mockapp)
      .put("/challenges/1/habits/3")
      .set("Authorization", `Bearer ${token}`)
      .send({ habit_name: "updated_habit" });
    const response = await request(mockapp)
      .put("/challenges/13/habits/3")
      .set("Authorization", `Bearer ${token}`)
      .send({ habit_name: "updated_habit" });
    expect(response.status).toBe(403);
    expect(response.body.error.message).toBe(
      "User is not authorized to access given challenge data",
    );
  });
  it("should return 400 if we are not on day 1", async () => {
    mockPrisma.challenges.findFirst.mockResolvedValue({
      id: 1,
      challenge_name: "Test challenge",
      user_id: 1,
      current_day: 12,
      total_habits: 3,
      challenge_habits: [
        {
          habit_name: "Habit 3",
          habit_order: 3,
        },
      ],
    });
    const response = await request(mockapp)
      .put("/challenges/1/habits/3")
      .set("Authorization", `Bearer ${token}`)
      .send({ habit_name: "updated_habit" });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe(
      "Unable to modify habit name beyond day 1",
    );
  });
  it("should handle db error gracefully", async () => {
    mockPrisma.challenges.findFirst.mockResolvedValue({
      id: 1,
      challenge_name: "Test challenge",
      user_id: 1,
      current_day: 1,
      total_habits: 3,
      challenge_habits: [
        {
          habit_name: "Habit 3",
          habit_order: 3,
        },
      ],
    });
    mockPrisma.challenge_habits.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Connection lost", {
        code: "P1001",
        clientVersion: "5.0.0",
      }),
    );
    const response = await request(mockapp)
      .put("/challenges/1/habits/3")
      .set("Authorization", `Bearer ${token}`)
      .send({ habit_name: "updated_habit" });
    expect(response.status).toBe(500);
    expect(response.body.error.message).toBe("Unable to update habit name");
    expect(mockPrisma.challenge_habits.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: {
        habit_name: "updated_habit",
      },
    });
  });
  it("should return 200 if habit successfully created", async () => {
    mockPrisma.challenges.findFirst.mockResolvedValue({
      id: 1,
      challenge_name: "Test challenge",
      user_id: 1,
      current_day: 1,
      total_habits: 3,
      challenge_habits: [
        {
          habit_name: "Habit 3",
          habit_order: 3,
        },
      ],
    });
    mockPrisma.challenge_habits.update.mockResolvedValue({
      id: 3,
      habit_name: 3,
      habit_order: 3,
    });
    const response = await request(mockapp)
      .put("/challenges/1/habits/3")
      .set("Authorization", `Bearer ${token}`)
      .send({ habit_name: "updated_habit" });
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Successfully updated habit name");
    expect(mockPrisma.challenge_habits.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: {
        habit_name: "updated_habit",
      },
    });
  });
});

// descibe.skip("Created challenge habits should appear in the database after creation", () => {
//     beforeAll( async() => {
//         // Login user
//         const loginResp = await request(app).post("/auth/login").send({email:"alice@hard75.com", password:"test1234"});

//         token = loginResp.body.token;

//         // Collect user information
//         const returnedUser = await request(app).get("/users/profile")
//                                                 .set("Authorization", `Bearer ${token}`);

//         userId = returnedUser.body.user.id;

//         // create challenge
//         const challenge = await request(app).post("/challenges/create")
//                 .set("Authorization", `Bearer ${token}`)
//                 .send({challenge_name: "Test challenge", total_habits:4})

//      })

//     it("created habits should appear in ")
// })
