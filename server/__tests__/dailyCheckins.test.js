import express from "express";
import request from "supertest";
import { Prisma } from "@prisma/client";

import app from "../src/app.js";
import { createChallengeRoutes } from "../src/routes/challengeRoutes.js";
import { createUserRoutes } from "../src/routes/userRoutes.js";
import { createAuthRoutes } from "../src/routes/authRoutes.js";
import { createDailyCheckins } from "../src/routes/dailyCheckins.js";
import { createMockPrismaClient } from "./helpers/mockPrisma.js";
import { getStartOfDay } from "../src/utils/dateHelpers.js";
import {
  createMockChallenge,
  createMockHabit,
  createMockDailyCheckin,
} from "./helpers/testData.js";

describe("Testing /checkin/:id endpoint", () => {
  let mockapp;
  let mockPrisma;
  let token;
  let userId;
  beforeAll(async () => {
    mockapp = express();
    mockPrisma = createMockPrismaClient();
    const authRoutes = createAuthRoutes(mockPrisma);
    const challengeRoutes = createChallengeRoutes(mockPrisma);
    const checkinRoutes = createDailyCheckins(mockPrisma);
    const userRoutes = createUserRoutes(mockPrisma);
    mockapp.use(express.json()); // parse json into objects
    mockapp.use("/auth", authRoutes);
    mockapp.use("/users", userRoutes);
    // mockapp.use("/challenges", challengeRoutes);
    mockapp.use("/checkin", checkinRoutes);

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
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it("should return 400 if challenge id is invalid", async () => {
    const response = await request(mockapp)
      .post("/checkin/invalid")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Invalid challenge ID");
  });
  it("should return 404 if challenge does not exist", async () => {
    const currentDay = 10;
    const mockChallenge = createMockChallenge({
      current_day: currentDay,
      user_id: 123,
      status: "active",
    });
    const challengeId = mockChallenge.id;
    mockPrisma.challenges.findUnique.mockResolvedValue(null);
    const response = await request(mockapp)
      .post(`/checkin/${challengeId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe(
      "Unable to create checkin for non existant challenge",
    );
    expect(mockPrisma.daily_checkins.findUnique).not.toHaveBeenCalled();
  });
  it("should return 401 if user is not authenticated", async () => {
    const currentDay = 10;
    const challengeId = 5;

    const response = await request(mockapp)
      .post(`/checkin/${challengeId}`)
      .set("Authorization", "Bearer invalid-jwt-token");
    expect(response.status).toBe(401);
    // expect(response.body.error.message).toBe("Invalid token");

    // Verify no database calls were made since auth failed first
    expect(mockPrisma.challenges.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.daily_checkins.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.challenge_habits.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.daily_checkins.create).not.toHaveBeenCalled();
  });
  it("should only allow us to mark today's checkin", async () => {
    const currentDay = 10;
    const challengeId = 5;
    const checkinDate = getStartOfDay(new Date());
    const mockChallenge = createMockChallenge({
      id: challengeId,
      current_day: currentDay,
      user_id: userId,
      status: "active",
    });
    const mockDailyCheckin = createMockDailyCheckin({
      day_number: currentDay,
      completed_habit_ids: [],
      all_habits_completed: false,
      user_id: userId,
      challenge_id: challengeId,
      checkin_date: checkinDate,
    });
    const mockHabits = createMockHabit(4);

    mockPrisma.challenges.findUnique.mockResolvedValue(mockChallenge);
    mockPrisma.daily_checkins.findFirst.mockResolvedValue(null);
    mockPrisma.challenge_habits.findMany.mockResolvedValue(mockHabits);
    mockPrisma.daily_checkins.create.mockResolvedValue(mockDailyCheckin);
    const response = await request(mockapp)
      .post(`/checkin/${challengeId}`)
      .set("Authorization", `Bearer ${token}`);
    const responseDate = new Date(response.body.checkin.checkin_date);
    expect(responseDate.toISOString()).toBe(checkinDate.toISOString());
  });
  it("should not allow us to mark complete for failed challenges", async () => {
    const currentDay = 10;
    const challengeId = 5;
    const mockChallenge = createMockChallenge({
      id: challengeId,
      current_day: currentDay,
      status: "failed",
      user_id: userId,
    });

    mockPrisma.challenges.findUnique.mockResolvedValue(mockChallenge);

    const response = await request(mockapp)
      .post(`/checkin/${challengeId}`)
      .set("Authorization", `Bearer ${token}`);

    // Verify response
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe(
      "Unable to access checkins for non active challenges",
    );
    expect(mockPrisma.daily_checkins.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.challenge_habits.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.daily_checkins.create).not.toHaveBeenCalled();
  });
  it("should return 403 if challenge does not belong to user", async () => {
    const currentDay = 10;
    const mockChallenge = createMockChallenge({
      current_day: currentDay,
      user_id: 54,
      status: "active",
    });
    mockPrisma.challenges.findUnique.mockResolvedValue(mockChallenge);
    const challengeId = mockChallenge.id;
    const response = await request(mockapp)
      .post(`/checkin/${challengeId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(403);
    expect(response.body.error.message).toBe(
      "User is not authorized to access given challenge data",
    );
  });

  it("should have correct day_number from challenge", async () => {
    const currentDay = 10;
    const challengeId = 5;
    const mockChallenge = createMockChallenge({
      id: challengeId,
      current_day: currentDay,
      user_id: userId,
      status: "active",
    });

    const mockHabits = createMockHabit(4);
    const mockDailyCheckin = createMockDailyCheckin({
      day_number: currentDay,
      completed_habit_ids: [],
      all_habits_completed: false,
      user_id: userId,
      challenge_id: challengeId,
    });

    mockPrisma.challenges.findUnique.mockResolvedValue(mockChallenge);
    mockPrisma.challenge_habits.findMany.mockResolvedValue(mockHabits);
    mockPrisma.daily_checkins.findUnique.mockResolvedValue(null);
    mockPrisma.daily_checkins.create.mockResolvedValue(mockDailyCheckin);

    const response = await request(mockapp)
      .post(`/checkin/${challengeId}`)
      .set("Authorization", `Bearer ${token}`);

    // Assert the check-in was created with the correct day number from the challenge
    console.log("Checkin day number", response.body.checkin);
    expect(response.body.checkin.day_number).toBe(mockChallenge.current_day);
  });
  it("should have completed_habit_ids empty", async () => {
    const currentDay = 10;
    const challengeId = 5;
    const mockChallenge = createMockChallenge({
      id: challengeId,
      current_day: currentDay,
      user_id: userId,
      status: "active",
    });
    const mockHabits = createMockHabit(4);
    const mockDailyCheckin = createMockDailyCheckin({
      day_number: currentDay,
      completed_habit_ids: [],
      all_habits_completed: false,
      user_id: userId,
      challenge_id: challengeId,
    });

    mockPrisma.challenges.findUnique.mockResolvedValue(mockChallenge);
    mockPrisma.challenge_habits.findMany.mockResolvedValue(mockHabits);
    mockPrisma.daily_checkins.findUnique.mockResolvedValue(null);
    mockPrisma.daily_checkins.create.mockResolvedValue(mockDailyCheckin);

    const response = await request(mockapp)
      .post(`/checkin/${challengeId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(response.body.checkin.completed_habit_ids).toEqual([]);
  });
  it("should start with all_completed false", async () => {
    const currentDay = 10;
    const challengeId = 5;
    const mockChallenge = createMockChallenge({
      id: challengeId,
      current_day: currentDay,
      user_id: userId,
      status: "active",
    });
    const mockHabits = createMockHabit(4);
    const mockDailyCheckin = createMockDailyCheckin({
      day_number: currentDay,
      completed_habit_ids: [],
      all_habits_completed: false,
      user_id: userId,
      challenge_id: challengeId,
    });

    mockPrisma.challenges.findUnique.mockResolvedValue(mockChallenge);
    mockPrisma.challenge_habits.findMany.mockResolvedValue(mockHabits);
    mockPrisma.daily_checkins.findUnique.mockResolvedValue(null);
    mockPrisma.daily_checkins.create.mockResolvedValue(mockDailyCheckin);

    const response = await request(mockapp)
      .post(`/checkin/${challengeId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.body.checkin.all_habits_completed).toEqual(false);
  });
  it("should not create duplicate check-in for same date", async () => {
    const currentDay = 10;
    const challengeId = 5;
    const mockChallenge = createMockChallenge({
      id: challengeId,
      current_day: currentDay,
      user_id: userId,
      status: "active",
    });
    const mockHabits = createMockHabit(4);
    const mockDailyCheckin = createMockDailyCheckin({
      day_number: currentDay,
      completed_habit_ids: [],
      all_habits_completed: false,
      user_id: userId,
      challenge_id: challengeId,
    });

    mockPrisma.challenges.findUnique.mockResolvedValue(mockChallenge);
    mockPrisma.challenge_habits.findMany.mockResolvedValue(mockHabits);
    mockPrisma.daily_checkins.findUnique.mockResolvedValue(null);
    mockPrisma.daily_checkins.create.mockResolvedValue(mockDailyCheckin);

    const response = await request(mockapp)
      .post(`/checkin/${challengeId}`)
      .set("Authorization", `Bearer ${token}`);
    const checkin = response.body.checkin;

    // Mock the second call to return an existing check-in for the same day
    const mockDailyCheckin1 = createMockDailyCheckin({
      current_day: currentDay,
      completed_habit_ids: [12, 15, 17],
      all_habits_completed: false,
      user_id: userId,
      challenge_id: challengeId,
    });

    mockPrisma.challenges.findUnique.mockResolvedValue(mockChallenge);
    mockPrisma.challenge_habits.findMany.mockResolvedValue(mockHabits);
    mockPrisma.daily_checkins.findUnique.mockResolvedValue(mockDailyCheckin1);

    const response1 = await request(mockapp)
      .post(`/checkin/${challengeId}`)
      .set("Authorization", `Bearer ${token}`);

    const checkin1 = response1.body.checkin;
    expect(checkin.id).toEqual(checkin1.id);
  });
  it("should return check-in if called twice on the same day", async () => {
    const currentDay = 10;
    const challengeId = 5;
    const mockChallenge = createMockChallenge({
      id: challengeId,
      current_day: currentDay,
      user_id: userId,
      status: "active",
    });
    const mockHabits = createMockHabit(4);
    const mockDailyCheckin = createMockDailyCheckin({
      day_number: currentDay,
      completed_habit_ids: [],
      all_habits_completed: false,
      user_id: userId,
      challenge_id: challengeId,
    });

    mockPrisma.challenges.findUnique.mockResolvedValue(mockChallenge);
    mockPrisma.challenge_habits.findMany.mockResolvedValue(mockHabits);
    mockPrisma.daily_checkins.findFirst.mockResolvedValue(null);
    mockPrisma.daily_checkins.create.mockResolvedValue(mockDailyCheckin);

    const response = await request(mockapp)
      .post(`/checkin/${challengeId}`)
      .set("Authorization", `Bearer ${token}`);
    const checkin = response.body.checkin;

    // Mock the second call to return an existing check-in for the same day
    const mockDailyCheckin1 = createMockDailyCheckin({
      current_day: currentDay,
      completed_habit_ids: [12, 15, 17],
      all_habits_completed: false,
      user_id: userId,
      challenge_id: challengeId,
    });

    mockPrisma.challenges.findUnique.mockResolvedValue(mockChallenge);
    mockPrisma.challenge_habits.findMany.mockResolvedValue(mockHabits);
    mockPrisma.daily_checkins.findFirst.mockResolvedValue(mockDailyCheckin1);

    const response1 = await request(mockapp)
      .post(`/checkin/${challengeId}`)
      .set("Authorization", `Bearer ${token}`);
    const checkin1 = response1.body.checkin;

    expect(response.status).toBe(201);
    expect(response1.status).toBe(200);
    expect(mockPrisma.daily_checkins.create).toHaveBeenCalledTimes(1); // Only the first call should create a check-in
  });
  it("should reject if challenge is not active", async () => {
    const currentDay = 10;
    const challengeId = 5;
    const mockChallenge = createMockChallenge({
      id: challengeId,
      current_day: currentDay,
      user_id: userId,
      status: "failed",
    });
    console.log("Mock challenge", mockChallenge.status);

    mockPrisma.challenges.findUnique.mockResolvedValue(mockChallenge);

    const response = await request(mockapp)
      .post(`/checkin/${challengeId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe(
      "Unable to access checkins for non active challenges",
    );
  });
  it("should reject if challenge has no habit", async () => {
    const currentDay = 10;
    const challengeId = 5;
    const mockChallenge = createMockChallenge({
      id: challengeId,
      current_day: currentDay,
      user_id: userId,
      status: "active",
    });

    mockPrisma.challenges.findUnique.mockResolvedValue(mockChallenge);
    mockPrisma.daily_checkins.findFirst.mockResolvedValue(null);
    mockPrisma.challenge_habits.findMany.mockResolvedValue([]);

    const response = await request(mockapp)
      .post(`/checkin/${challengeId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe(
      "Unable to create checkin: challenge has no habits defined",
    );
  });
  it("should allow multiple challenges to have same check-in date", async () => {
    // Login user 2
    mockPrisma.users.findUnique.mockResolvedValue({
      email: "bobe@hard75.com",
      password: "$2b$10$5S.IAkN8GcDG543HHHjW/O.Bh3nTf10Y/kIljDZzG7j6Nl65bk0t.",
      id: 2,
      name: "Bob",
    });

    // Login user
    const loginResp = await request(mockapp)
      .post("/auth/login")
      .send({ email: "bob@hard75.com", password: "test1234" });

    const token1 = loginResp.body.token;

    // Collect user information
    const returnedUser = await request(mockapp)
      .get("/users/profile")
      .set("Authorization", `Bearer ${token1}`);
    const userId1 = returnedUser.body.user.id;

    // challenge 1
    const challengeId = 5;
    const currentDay = 10;
    const mockChallenge = createMockChallenge({
      id: challengeId,
      current_day: currentDay,
      user_id: userId,
      status: "active",
    });
    const mockHabits = createMockHabit(4);
    const mockDailyCheckin = createMockDailyCheckin({
      day_number: currentDay,
      completed_habit_ids: [],
      all_habits_completed: false,
      user_id: userId,
      challenge_id: challengeId,
    });

    mockPrisma.challenges.findUnique.mockResolvedValue(mockChallenge);
    mockPrisma.challenge_habits.findMany.mockResolvedValue(mockHabits);
    mockPrisma.daily_checkins.findFirst.mockResolvedValue(null);
    mockPrisma.daily_checkins.create.mockResolvedValue(mockDailyCheckin);

    const response = await request(mockapp)
      .post(`/checkin/${challengeId}`)
      .set("Authorization", `Bearer ${token}`);
    const checkin = response.body.checkin;

    // challenge 2 with same check-in date but different user
    const challengeId1 = 15;
    const currentDay1 = 18;
    const mockChallenge1 = createMockChallenge({
      id: challengeId1,
      current_day: currentDay1,
      user_id: userId1,
      status: "active",
    });
    const mockHabits1 = createMockHabit(3);
    const mockDailyCheckin1 = createMockDailyCheckin({
      day_number: currentDay1,
      completed_habit_ids: [],
      all_habits_completed: false,
      user_id: userId1,
      challenge_id: challengeId,
    });

    mockPrisma.challenges.findUnique.mockResolvedValue(mockChallenge1);
    mockPrisma.challenge_habits.findMany.mockResolvedValue(mockHabits1);
    mockPrisma.daily_checkins.findFirst.mockResolvedValue(null);
    mockPrisma.daily_checkins.create.mockResolvedValue(mockDailyCheckin1);

    const response1 = await request(mockapp)
      .post(`/checkin/${challengeId1}`)
      .set("Authorization", `Bearer ${token1}`);
    const checkin1 = response1.body.checkin;

    expect(response.status).toBe(201);
    expect(response1.status).toBe(201);

    const checkinDate = new Date(checkin.checkin_date);
    const checkinDate1 = new Date(checkin1.checkin_date);

    expect(checkinDate.toISOString()).toBe(checkinDate1.toISOString());
    expect(checkin.user_id).not.toBe(checkin1.user_id);
  });
});

describe("Testing put /checkin/:id endpoint", () => {
  let mockapp;
  let mockPrisma;
  let token;
  let userId;
  beforeAll(async () => {
    mockapp = express();
    mockPrisma = createMockPrismaClient();
    const authRoutes = createAuthRoutes(mockPrisma);
    const challengeRoutes = createChallengeRoutes(mockPrisma);
    const checkinRoutes = createDailyCheckins(mockPrisma);
    const userRoutes = createUserRoutes(mockPrisma);
    mockapp.use(express.json()); // parse json into objects
    mockapp.use("/auth", authRoutes);
    mockapp.use("/users", userRoutes);
    // mockapp.use("/challenges", challengeRoutes);
    mockapp.use("/checkin", checkinRoutes);

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
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it("should return 400 if challenge id is invalid", async () => {
    const checkinId = "invalid-id";
    const response = await request(mockapp)
      .put(`/checkin/${checkinId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ habitId: 5, completed: true });
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Invalid checkin ID");
  });
  it("should return 400 if habit id is invalid", async () => {
    const checkinId = 5;
    const habitId = "invalid-habit-id";
    const response = await request(mockapp)
      .put(`/checkin/${checkinId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ habitId: habitId, completed: true });

    console.log("Response", response.body);
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Need to provide valid habitId");
  });

  it("should return 404 if checkin does not exist", async () => {
    const checkinId = 999;
    const currentDay = 10;
    const habitId = 3;
    mockPrisma.daily_checkins.findUnique.mockResolvedValue(null); // No existing checkin
    const response = await request(mockapp)
      .put(`/checkin/${checkinId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ habitId: habitId, completed: true });
    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe("Checkin not found");
  });
  it("should return 401 if user is not authenticated", async () => {
    const checkinId = 999;
    const currentDay = 10;
    const habitId = 3;
    const token = null;
    const response = await request(mockapp)
      .put(`/checkin/${checkinId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ habitId: habitId, completed: true });
    expect(response.status).toBe(401);
    // expect(response.body.error.message).toBe("Invalid token");
  });
  it("should return 403 if challenge does not belong to user", async () => {
    const checkinId = 999;
    const currentDay = 10;
    const habitId = 3;
    const totalHabits = 4;
    const mockChallenge = createMockChallenge({
      user_id: userId,
      current_day: currentDay,
      status: "active",
      total_habits: totalHabits,
    });
    const keywords = ["id", "status", "current_day", "total_habits"];
    const filteredChallenge = Object.fromEntries(
      Object.entries(mockChallenge).filter(([key]) => keywords.includes(key)),
    );

    const mockHabits = createMockHabit(
      (numberHabits = totalHabits),
      (challengeId = mockChallenge.id),
    );
    mockHabits[0].id = habitId; // Ensure one habit has the ID we're testing with

    const mockDailyCheckin = createMockDailyCheckin({
      chalenge_id: mockChallenge.id,
      day_number: currentDay,
      completed_habit_ids: [],
      all_habits_completed: false,
      user_id: 999,
      challenge: {
        ...filteredChallenge,
        challenge_habits: mockHabits,
      },
    });

    mockPrisma.daily_checkins.findUnique.mockResolvedValue(mockDailyCheckin);
    const response = await request(mockapp)
      .put(`/checkin/${checkinId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ habitId: habitId, completed: true });
    expect(response.status).toBe(403);
    expect(response.body.error.message).toBe(
      "User is not authorized to access given challenge data",
    );
  });
  it("should return 403 if checkin does not belong to user", async () => {
    const checkinId = 999;
    const currentDay = 10;
    const habitId = 3;
    const totalHabits = 4;

    const mockChallenge = createMockChallenge({
      user_id: userId,
      current_day: currentDay,
      status: "active",
      total_habits: totalHabits,
    });
    const keywords = ["id", "status", "current_day", "total_habits"];
    const filteredChallenge = Object.fromEntries(
      Object.entries(mockChallenge).filter(([key]) => keywords.includes(key)),
    );
    const mockHabits = createMockHabit((numberHabits = 4), {
      challenge_id: mockChallenge.id,
    });

    const mockDailyCheckin = createMockDailyCheckin({
      chalenge_id: mockChallenge.id,
      day_number: currentDay,
      completed_habit_ids: [],
      all_habits_completed: false,
      user_id: userId, // checkin belongs to user but the habit does not belong to the user's challenge
      challenge: {
        ...filteredChallenge,
        challenge_habits: mockHabits,
      },
    });

    mockPrisma.daily_checkins.findUnique.mockResolvedValue(mockDailyCheckin);
    const response = await request(mockapp)
      .put(`/checkin/${checkinId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ habitId: habitId, completed: true });
    expect(response.status).toBe(403);
    expect(response.body.error.message).toBe(
      "User does not have access to the given habit",
    );
  });
  it("should return 400 if checkin date is not present date", async () => {
    const checkinId = 999;
    const currentDay = 10;
    const habitId = 3;
    const totalHabits = 4;

    const mockChallenge = createMockChallenge({
      user_id: userId,
      current_day: currentDay,
      status: "active",
      total_habits: totalHabits,
    });
    const keywords = ["id", "status", "current_day", "total_habits"];
    const filteredChallenge = Object.fromEntries(
      Object.entries(mockChallenge).filter(([key]) => keywords.includes(key)),
    );
    const mockHabits = createMockHabit((numberHabits = 4), {
      challenge_id: mockChallenge.id,
    });
    mockHabits[0].id = habitId; // Ensure one habit has the ID we're testing with
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const mockDailyCheckin = createMockDailyCheckin({
      day_number: currentDay,
      completed_habit_ids: [],
      all_habits_completed: false,
      user_id: userId,
      checkin_date: getStartOfDay(yesterday), // Set checkin date to yesterday
      challenge: {
        ...filteredChallenge,
        challenge_habits: mockHabits,
      },
    });
    console.log("Mock daily checkin date ", mockDailyCheckin.checkin_date);
    mockPrisma.daily_checkins.findUnique.mockResolvedValue(mockDailyCheckin);
    const response = await request(mockapp)
      .put(`/checkin/${checkinId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ habitId: habitId, completed: true });
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe(
      "Can only update checkins for the current day",
    );
  });
  it("should return 400 if challenge has not habits defined", async () => {
    const checkinId = 999;
    const currentDay = 10;
    const habitId = 3;
    const totalHabits = 0;
    const mockChallenge = createMockChallenge({
      user_id: userId,
      current_day: currentDay,
      status: "active",
    });
    const keywords = ["id", "status", "current_day", "total_habits"];
    const filteredChallenge = Object.fromEntries(
      Object.entries(mockChallenge).filter(([key]) => keywords.includes(key)),
    );
    const mockHabits = createMockHabit((numberHabits = totalHabits), {
      challenge_id: mockChallenge.id,
    });

    const mockDailyCheckin = createMockDailyCheckin({
      day_number: currentDay,
      completed_habit_ids: [],
      all_habits_completed: false,
      user_id: userId,
      challenge: {
        ...filteredChallenge,
        challenge_habits: mockHabits,
      },
    });

    mockPrisma.daily_checkins.findUnique.mockResolvedValue(mockDailyCheckin);
    const response = await request(mockapp)
      .put(`/checkin/${checkinId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ habitId: habitId, completed: true });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe(
      "Unable to update checkin: challenge has no habits defined",
    );
  });
  it("should return 400 if challenge is not active ", async () => {
    const checkinId = 999;
    const currentDay = 10;
    const habitId = 3;
    const totalHabits = 4;
    const mockChallenge = createMockChallenge({
      user_id: userId,
      current_day: currentDay,
      status: "failed",
    });
    const keywords = ["id", "status", "current_day", "total_habits"];
    const filteredChallenge = Object.fromEntries(
      Object.entries(mockChallenge).filter(([key]) => keywords.includes(key)),
    );
    const mockHabits = createMockHabit((numberHabits = totalHabits), {
      challenge_id: mockChallenge.id,
    });
    mockHabits[totalHabits - 1].id = habitId; // Ensure one habit has the ID we're testing with

    const mockDailyCheckin = createMockDailyCheckin({
      day_number: currentDay,
      completed_habit_ids: [],
      all_habits_completed: false,
      user_id: userId,
      challenge: {
        ...filteredChallenge,
        challenge_habits: mockHabits,
      },
    });
    mockPrisma.daily_checkins.findUnique.mockResolvedValue(mockDailyCheckin);
    const response = await request(mockapp)
      .put(`/checkin/${checkinId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ habitId: habitId, completed: true });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe(
      "Unable to update checkin for non active challenges",
    );
  });
  it("should update checkin with completed habit and return updated checkin if habit_completion is marked true", async () => {
    const checkinId = 999;
    const currentDay = 10;
    const habitId = 13;
    const totalHabits = 4;
    const mockChallenge = createMockChallenge({
      user_id: userId,
      current_day: currentDay,
      status: "active",
      total_habits: totalHabits,
    });
    const mockHabits = createMockHabit(
      (numberHabits = totalHabits),
      (challenge_id = mockChallenge.id),
    );
    const keywords = ["id", "status", "current_day", "total_habits"];
    const filteredChallenge = Object.fromEntries(
      Object.entries(mockChallenge).filter(([key]) => keywords.includes(key)),
    );
    mockHabits[totalHabits - 1].id = habitId; // Ensure one habit has the ID we're testing with
    const mockDailyCheckin = createMockDailyCheckin({
      id: checkinId,

      day_number: currentDay,
      completed_habit_ids: [],
      all_habits_completed: false,
      user_id: userId,
      challenge: {
        ...filteredChallenge,
        challenge_habits: mockHabits,
      },
    });
    // console.log(
    //   "Mock daily checkin ",
    //   JSON.stringify(mockDailyCheckin, null, 2),
    // );
    const updatedCheckin = {
      ...mockDailyCheckin,
      completed_habit_ids: [habitId],
    };
    mockPrisma.daily_checkins.findUnique.mockResolvedValue(mockDailyCheckin);
    mockPrisma.daily_checkins.update.mockResolvedValue(updatedCheckin);
    const response = await request(mockapp)
      .put(`/checkin/${checkinId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ habitId: habitId, completed: true });

    expect(response.status).toBe(200);
    expect(response.body.checkin.completed_habit_ids).toContain(habitId);
  });
  it("should update checkin with completed habit and return updated checkin if habit_completion is marked false", async () => {
    const checkinId = 999;
    const currentDay = 10;
    const totalHabits = 4;
    const mockChallenge = createMockChallenge({
      user_id: userId,
      current_day: currentDay,
      status: "active",
      total_habits: totalHabits,
    });
    const keywords = ["id", "status", "current_day", "total_habits"];
    const filteredChallenge = Object.fromEntries(
      Object.entries(mockChallenge).filter(([key]) => keywords.includes(key)),
    );
    const mockHabits = createMockHabit((numberHabits = 4), {
      challenge_id: mockChallenge.id,
    });
    const habitId = mockHabits[0].id;
    const mockDailyCheckin = createMockDailyCheckin({
      day_number: currentDay,
      completed_habit_ids: [habitId, mockHabits[1].id],
      all_habits_completed: false,
      user_id: userId,
      challenge: {
        ...filteredChallenge,
        challenge_habits: mockHabits,
      },
    });
    const updatedCheckin = {
      ...mockDailyCheckin,
      completed_habit_ids: [mockHabits[1].id],
    };
    mockPrisma.daily_checkins.findUnique.mockResolvedValue(mockDailyCheckin);
    mockPrisma.daily_checkins.update.mockResolvedValue(updatedCheckin);

    const response = await request(mockapp)
      .put(`/checkin/${checkinId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ habitId: habitId, completed: false });
    expect(response.status).toBe(200);

    expect(response.body.checkin.completed_habit_ids).not.toContain(habitId);
  });
  it("should update checkin to all habits completed and update challenge day and status if needed", async () => {
    const checkinId = 999;
    const currentDay = 10;
    const totalHabits = 4;
    const mockChallenge = createMockChallenge({
      user_id: userId,
      current_day: currentDay,
      status: "active",
      total_habits: totalHabits,
    });

    const mockHabits = createMockHabit((numberHabits = 4), {
      challenge_id: mockChallenge.id,
    });
    const keywords = ["id", "status", "current_day", "total_habits"];
    const filteredChallenge = Object.fromEntries(
      Object.entries(mockChallenge).filter(([key]) => keywords.includes(key)),
    );
    const habitIds = mockHabits.map((habit) => habit.id);
    const mockDailyCheckin = createMockDailyCheckin({
      day_number: currentDay,
      completed_habit_ids: habitIds.slice(0, totalHabits - 1),
      all_habits_completed: false,
      user_id: userId,
      challenge: {
        ...filteredChallenge,
        challenge_habits: mockHabits,
      },
    });
    const updatedCheckin = {
      ...mockDailyCheckin,
      completed_habit_ids: habitIds,
      all_habits_completed: true,
    };
    mockPrisma.daily_checkins.findUnique.mockResolvedValue(mockDailyCheckin);
    mockPrisma.daily_checkins.update.mockResolvedValue(updatedCheckin);
    mockPrisma.challenges.update.mockResolvedValue({
      ...mockChallenge,
      current_day: currentDay + 1,
    });
    const response = await request(mockapp)
      .put(`/checkin/${checkinId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ habitId: habitIds[totalHabits - 1], completed: true });
    expect(response.status).toBe(200);
    expect(response.body.checkin.completed_habit_ids).toEqual(habitIds);
    expect(response.body.checkin.all_habits_completed).toBe(true);
  });
  it("should update checkin to all habits completed and update challenge day and status if needed", async () => {
    const checkinId = 999;
    const currentDay = 75;
    const totalHabits = 4;
    const mockChallenge = createMockChallenge({
      user_id: userId,
      current_day: currentDay,
      status: "active",
      total_habits: totalHabits,
    });
    const keywords = ["id", "status", "current_day", "total_habits"];
    const filteredChallenge = Object.fromEntries(
      Object.entries(mockChallenge).filter(([key]) => keywords.includes(key)),
    );
    const mockHabits = createMockHabit(
      (numberHabits = totalHabits),
      (challenge_id = mockChallenge.id),
    );
    const habitIds = mockHabits.map((habit) => habit.id);
    const mockDailyCheckin = createMockDailyCheckin({
      day_number: currentDay,
      completed_habit_ids: habitIds.slice(0, totalHabits - 1),
      all_habits_completed: false,
      user_id: userId,
      challenge: {
        ...filteredChallenge,
        challenge_habits: mockHabits,
      },
    });
    const updatedCheckin = {
      ...mockDailyCheckin,
      completed_habit_ids: habitIds,
      all_habits_completed: true,
    };
    mockPrisma.daily_checkins.findUnique.mockResolvedValue(mockDailyCheckin);
    mockPrisma.daily_checkins.update.mockResolvedValue(updatedCheckin);
    mockPrisma.challenges.update.mockResolvedValue({
      ...filteredChallenge,
      current_day: currentDay + 1,
      status: "completed",
    });
    const response = await request(mockapp)
      .put(`/checkin/${checkinId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ habitId: habitIds[totalHabits - 1], completed: true });

    expect(response.status).toBe(200);
    expect(response.body.checkin.completed_habit_ids).toEqual(habitIds);
    expect(response.body.checkin.all_habits_completed).toBe(true);
    // expect(response.body.challenge.current_day).toBe(currentDay + 1);
    // expect(response.body.challenge.status).toBe("completed");
    expect(mockPrisma.challenges.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockChallenge.id },
      }),
    );
  });
  it("should not update challenge day or status if not all habits completed", async () => {
    const checkinId = 999;
    const currentDay = 10;
    const totalHabits = 4;
    const mockChallenge = createMockChallenge({
      user_id: userId,
      current_day: currentDay,
      status: "active",
      total_habits: totalHabits,
    });
    const keywords = ["id", "status", "current_day", "total_habits"];
    const filteredChallenge = Object.fromEntries(
      Object.entries(mockChallenge).filter(([key]) => keywords.includes(key)),
    );
    const mockHabits = createMockHabit(
      (numberHabits = 4),
      (challenge_id = mockChallenge.id),
    );
    const habitIds = mockHabits.map((habit) => habit.id);
    const mockDailyCheckin = createMockDailyCheckin({
      day_number: currentDay,
      completed_habit_ids: habitIds.slice(0, totalHabits - 2),
      all_habits_completed: false,
      user_id: userId,
      challenge: {
        ...filteredChallenge,
        challenge_habits: mockHabits,
      },
    });
    const updatedCheckin = {
      ...mockDailyCheckin,
      completed_habit_ids: habitIds.slice(0, totalHabits - 1),
    };
    mockPrisma.daily_checkins.findUnique.mockResolvedValue(mockDailyCheckin);
    mockPrisma.daily_checkins.update.mockResolvedValue(updatedCheckin);
    const response = await request(mockapp)
      .put(`/checkin/${checkinId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ habitId: habitIds[2], completed: true });

    expect(response.status).toBe(200);
    expect(response.body.checkin.completed_habit_ids).toEqual(
      habitIds.slice(0, totalHabits - 1),
    );
    expect(response.body.checkin.all_habits_completed).toBe(false);
  });

  it("should handle db errors gracefully", async () => {
    const checkinId = 999;
    const currentDay = 10;
    const habitId = 3;
    const totalHabits = 4;
    const mockChallenge = createMockChallenge({
      user_id: userId,
      current_day: currentDay,
      status: "active",
      total_habits: totalHabits,
    });
    const keywords = ["id", "status", "current_day", "total_habits"];
    const filteredChallenge = Object.fromEntries(
      Object.entries(mockChallenge).filter(([key]) => keywords.includes(key)),
    );
    const mockHabits = createMockHabit((numberHabits = totalHabits), {
      challenge_id: mockChallenge.id,
    });
    mockHabits[0].id = habitId; // Ensure one habit has the ID we're testing with
    const mockDailyCheckin = createMockDailyCheckin({
      day_number: currentDay,
      completed_habit_ids: [],
      all_habits_completed: false,
      user_id: userId,
      challenge: {
        ...filteredChallenge,
        challenge_habits: mockHabits,
      },
    });
    mockPrisma.daily_checkins.findUnique.mockResolvedValue(mockDailyCheckin);
    mockPrisma.daily_checkins.update.mockRejectedValue(
      new Error("Database error"),
    );
    const response = await request(mockapp)
      .put(`/checkin/${checkinId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ habitId: habitId, completed: true });
    expect(response.status).toBe(500);
    expect(response.body.error.message).toBe("Unable to update habit status");
  });
});
