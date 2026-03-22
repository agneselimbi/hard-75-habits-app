import express from "express";
import request from "supertest";
import { Prisma } from "@prisma/client";

import app from "../src/app.js";
import { createChallengeRoutes } from "../src/routes/challengeRoutes.js";
import { createUserRoutes } from "../src/routes/userRoutes.js";
import { createAuthRoutes } from "../src/routes/authRoutes.js";
import { createDailyCheckinsRoutes } from "../src/routes/dailyCheckins.js";
import { createMockPrismaClient } from "./helpers/mockPrisma.js";
import { getStartOfDay, getDateDifference } from "../src/utils/dateHelpers.js";
import {
  createMockChallenge,
  createMockHabit,
  createMockDailyCheckin,
} from "./helpers/testData.js";

describe("Testing  get /checkin/:challengeId/today endpoint", () => {
  let mockapp;
  let mockPrisma;
  let token;
  let userId;
  beforeAll(async () => {
    mockapp = express();
    mockPrisma = createMockPrismaClient();
    const authRoutes = createAuthRoutes(mockPrisma);
    const challengeRoutes = createChallengeRoutes(mockPrisma);
    const checkinRoutes = createDailyCheckinsRoutes(mockPrisma);
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
      .get("/checkin/invalid/today")
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
      .get(`/checkin/${challengeId}/today`)
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe("Challenge not found");
    expect(mockPrisma.daily_checkins.findUnique).not.toHaveBeenCalled();
  });
  it("should return 401 if user is not authenticated", async () => {
    const challengeId = 5;

    const response = await request(mockapp)
      .get(`/checkin/${challengeId}/today`)
      .set("Authorization", "Bearer invalid-jwt-token");
    expect(response.status).toBe(401);

    // Verify no database calls were made since auth failed first
    expect(mockPrisma.challenges.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.daily_checkins.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.challenge_habits.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.daily_checkins.create).not.toHaveBeenCalled();
  });
  it("should return 200 if checkin already exists", async () => {
    const challengeId = 5;
    const currentDay = 1;
    const totalHabits = 4;
    const startDate = getDateDifference(new Date(), currentDay);
    const expectedDate = getDateDifference(startDate, -currentDay + 1);

    console.log("starDate", startDate);
    console.log("expectedDate", expectedDate);

    const mockChallenge = createMockChallenge({
      id: challengeId,
      user_id: userId,
      current_day: currentDay + 1,
      status: "active",
      start_date: startDate,
      total_habits: totalHabits,
    });
    const challengeHabits = createMockHabit(totalHabits, challengeId);
    const lastCheckIn = createMockDailyCheckin({
      user_id: userId,
      challenge_id: challengeId,
      checkin_date: getStartOfDay(new Date()),
      day_number: currentDay,
      all_habits_completed: true,
      completed_habit_ids: [],
    });

    mockPrisma.challenges.findFirst.mockResolvedValue(mockChallenge);
    mockPrisma.daily_checkins.findFirst.mockResolvedValue(lastCheckIn);

    const response = await request(mockapp)
      .get(`/checkin/${challengeId}/today`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Daily checkin already created");
  });
  it("should return 400 if the user has missed a day", async () => {
    const challengeId = 5;
    const currentDay = 10;
    const totalHabits = 4;
    const startDate = getDateDifference(new Date(), currentDay + 2);
    const expectedDate = getDateDifference(startDate, -currentDay);

    const mockChallenge = createMockChallenge({
      id: challengeId,
      user_id: userId,
      current_day: currentDay,
      status: "active",
      start_date: startDate,
      total_habits: totalHabits,
    });
    const challengeHabits = createMockHabit(totalHabits, challengeId);

    const lastCheckIn = createMockDailyCheckin({
      user_id: userId,
      challenge_id: challengeId,
      checkin_date: expectedDate,
      day_number: currentDay,
      all_habits_completed: false,
      completed_habit_ids: [],
    });

    const updatedChallenge = {
      ...mockChallenge,
      status: "failed",
      completed_at: getStartOfDay(lastCheckIn.checkin_date),
    };

    mockPrisma.challenges.findFirst.mockResolvedValue(mockChallenge);
    mockPrisma.daily_checkins.findFirst.mockResolvedValue(lastCheckIn);
    mockPrisma.challenges.update.mockResolvedValue();

    const response = await request(mockapp)
      .get(`/checkin/${challengeId}/today`)
      .set("Authorization", `Bearer ${token}`);
    console.log(response.body);
    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain(
      `Unable to create checkin for day`,
    );
  });
  it("should return 200 if the user has completed all challenges for the day and the current day has moved forward", async () => {
    const challengeId = 5;
    const currentDay = 10;
    const totalHabits = 4;
    const startDate = getDateDifference(new Date(), currentDay - 1);
    const expectedDate = getDateDifference(startDate, -currentDay);

    const mockChallenge = createMockChallenge({
      id: challengeId,
      user_id: userId,
      current_day: currentDay + 1,
      status: "active",
      start_date: startDate,
      total_habits: totalHabits,
    });
    const challengeHabits = createMockHabit(totalHabits, challengeId);

    const lastCheckIn = createMockDailyCheckin({
      user_id: userId,
      challenge_id: challengeId,
      checkin_date: expectedDate,
      day_number: currentDay,
      all_habits_completed: true,
      completed_habit_ids: [4, 5, 8, 9],
    });

    const updatedChallenge = {
      ...mockChallenge,
      status: "failed",
      completed_at: getStartOfDay(lastCheckIn.checkin_date),
    };

    mockPrisma.challenges.findFirst.mockResolvedValue(mockChallenge);
    mockPrisma.daily_checkins.findFirst.mockResolvedValue(lastCheckIn);
    mockPrisma.challenges.update.mockResolvedValue();

    const response = await request(mockapp)
      .get(`/checkin/${challengeId}/today`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toContain(`All tasks completed for`);
  });
  it("should return 400 if the challenge has no habit defined", async () => {
    const challengeId = 5;
    const currentDay = 2;
    const totalHabits = 0;
    const startDate = getDateDifference(new Date(), currentDay);
    const expectedDate = getDateDifference(startDate, -currentDay + 1);

    console.log("starDate", startDate);
    console.log("expectedDate", expectedDate);
    const mockChallenge = createMockChallenge({
      id: challengeId,
      user_id: userId,
      current_day: currentDay,
      status: "active",
      start_date: startDate,
      total_habits: totalHabits,
    });

    const challengeHabits = createMockHabit(totalHabits, challengeId);

    const lastCheckIn = createMockDailyCheckin({
      user_id: userId,
      challenge_id: challengeId,
      checkin_date: expectedDate,
      day_number: currentDay - 1,
      all_habits_completed: false,
      completed_habit_ids: [],
    });
    mockPrisma.challenges.findFirst.mockResolvedValue(mockChallenge);
    mockPrisma.daily_checkins.findFirst.mockResolvedValue(lastCheckIn);
    mockPrisma.challenge_habits.findMany(null);

    const response = await request(mockapp)
      .get(`/checkin/${challengeId}/today`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe(
      "Unable to create checkin: challenge has no habits defined",
    );
  });
  it("should create new daily checkin if no checkin found", async () => {
    const challengeId = 5;
    const currentDay = 2;
    const totalHabits = 4;
    const startDate = getDateDifference(new Date(), currentDay);
    const expectedDate = getDateDifference(startDate, -currentDay + 1);

    console.log("starDate", startDate);
    console.log("expectedDate", expectedDate);
    const mockChallenge = createMockChallenge({
      id: challengeId,
      user_id: userId,
      current_day: currentDay,
      status: "active",
      start_date: startDate,
      total_habits: totalHabits,
    });

    const challengeHabits = createMockHabit(totalHabits, challengeId);

    console.log(challengeHabits.length);

    const lastCheckIn = createMockDailyCheckin({
      user_id: userId,
      challenge_id: challengeId,
      checkin_date: expectedDate,
      day_number: currentDay - 1,
      all_habits_completed: true,
      completed_habit_ids: [4, 5, 8],
    });
    const createdCheckin = {
      ...lastCheckIn,
      day_number: lastCheckIn.day_number + 1,
      all_habits_completed: false,
      completed_habit_ids: [],
      checkin_date: getStartOfDay(new Date()),
    };
    mockPrisma.challenges.findFirst.mockResolvedValue(mockChallenge);
    mockPrisma.daily_checkins.findFirst.mockResolvedValue(lastCheckIn);
    mockPrisma.challenge_habits.findMany.mockResolvedValue(challengeHabits);
    mockPrisma.daily_checkins.create.mockResolvedValue(createdCheckin);

    const response = await request(mockapp)
      .get(`/checkin/${challengeId}/today`)
      .set("Authorization", `Bearer ${token}`);
    console.log(response.body);
    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Daily checkin created");
    expect(response.body.checkin.day_number).toEqual(currentDay);
    expect(response.body.checkin.all_habits_completed).toEqual(false);
    expect(response.body.checkin.completed_habit_ids.length).toEqual(0);
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
    const checkinRoutes = createDailyCheckinsRoutes(mockPrisma);
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
    const mockHabits = createMockHabit(
      (numberHabits = totalHabits),
      (challenge_id = mockChallenge.id),
    );

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

    const mockHabits = createMockHabit(
      (numberHabits = 4),
      (challenge_id = mockChallenge.id),
    );
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
    console.log(response.body);
    expect(response.status).toBe(200);
    expect(response.body.checkin.completed_habit_ids).toEqual(habitIds);
    expect(response.body.checkin.all_habits_completed).toBe(true);
  });
  it("should update checkin to all habits completed for final day and set challenge status to completed", async () => {
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

describe("Testing get /checkin/:challengeId/date endpoint", () => {
  let mockapp;
  let mockPrisma;
  let token;
  let userId;
  beforeAll(async () => {
    mockapp = express();
    mockPrisma = createMockPrismaClient();
    const authRoutes = createAuthRoutes(mockPrisma);
    const challengeRoutes = createChallengeRoutes(mockPrisma);
    const checkinRoutes = createDailyCheckinsRoutes(mockPrisma);
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
    //Login user
    const response = await request(mockapp)
      .post("/auth/login")
      .send({ email: "alice@hard75.com", password: "test1234" });
    token = response.body.token;

    // Collect user information
    const returnedUser = await request(mockapp)
      .get("/users/profile")
      .set("Authorization", `Bearer ${token}`);
    userId = returnedUser.body.user.id;
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it("should return 400 if challenge ID is invalid", async () => {
    const challengeId = "invalid-ID";
    const response = await request(mockapp)
      .get(`/checkin/${challengeId}/date`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Invalid challenge ID");
  });

  it("should return 404 if challenge is not found", async () => {
    const challengeId = 10;
    const startDate = "2025-02-20";
    const endDate = "2026-03-06";
    const completed = "false";

    mockPrisma.challenges.findUnique.mockResolvedValue(null);

    const response = await request(mockapp)
      .get(`/checkin/${challengeId}/date`)
      .set("Authorization", `Bearer ${token}`)
      .send({ startDate, endDate, completed });

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe("Challenge not found");
  });

  it("should return 403 if user is not authorized to given challenge", async () => {
    const challengeId = 10;
    let startDate = new Date("2026-02-20");
    let endDate = new Date("2026-03-06");
    const completed = "true";

    const mockChallenge = createMockChallenge({
      status: "active",
      current_day: 56,
    });

    mockPrisma.challenges.findUnique.mockResolvedValue(mockChallenge);
    const response = await request(mockapp)
      .get(`/checkin/${challengeId}/date`)
      .set("Authorization", `Bearer ${token}`)
      .send({ startDate, endDate, completed });

    expect(response.status).toBe(403);
    expect(response.body.error.message).toBe(
      "User is not authorized to access given challenge data",
    );
  });

  it("should return all checkins in valid date range", async () => {
    const challengeId = 10;
    let startDate = new Date("2026-02-20");
    let endDate = new Date("2026-03-06");
    const completed = "true";

    const mockChallenge = createMockChallenge({
      user_id: userId,
      status: "active",
      current_day: 56,
    });
    const keywords = ["id", "status", "current_day", "total_habits"];
    const filteredChallenge = Object.fromEntries(
      Object.entries(mockChallenge).filter(([key]) => keywords.includes(key)),
    );
    const mockHabits = createMockHabit(3, challengeId);
    let currentDate = startDate;
    let startDay = 10;
    let checkins = [];
    while (currentDate.getTime() <= endDate.getTime()) {
      console.log(currentDate, currentDate);
      let dailyCheckIn = createMockDailyCheckin({
        user_id: userId,
        challenge_id: challengeId,
        checkin_date: getStartOfDay(currentDate),
        all_habits_completed: true,
        completed_habit_ids: [3, 4, 5, 6],
        current_day: startDay,
      });
      dailyCheckIn = {
        ...dailyCheckIn,
        challenge: {
          filteredChallenge,
          challenge_habits: mockHabits,
        },
      };
      // Move to next day
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
      startDay++;
    }
    //console.log(checkins);

    mockPrisma.challenges.findUnique.mockResolvedValue(mockChallenge);
    mockPrisma.daily_checkins.findMany.mockResolvedValue(checkins);

    const response = await request(mockapp)
      .get(`/checkin/${challengeId}/date`)
      .set("Authorization", `Bearer ${token}`)
      .send({ startDate, endDate, completed });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Daily checkin retrieved");
  });
});
