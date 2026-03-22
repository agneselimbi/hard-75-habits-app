import express from "express";

import { getStartOfDay } from "../utils/dateHelpers.js";
import { authenticateMiddleware } from "../middleware/authenticateMiddleware.js";

function calculateStreak(checkins) {
  if (!checkins || checkins.length === 0) {
    return 0;
  }
  // Sort checkins by date in descending order
  const sortedCheckins = checkins.sort(
    (a, b) => b.checkin_date - a.checkin_date,
  );
  let streak = 0;
  let currentDate = getStartOfDay(new Date());
  for (const checkin of sortedCheckins) {
    const checkinDate = getStartOfDay(checkin.checkin_date);
    if (
      checkinDate.getTime() === currentDate.getTime() &&
      checkin.all_habits_completed
    ) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1); // Move to the previous day
    } else if (checkinDate.getTime() < currentDate.getTime()) {
      break; // Break the streak if we encounter a missed day or incomplete checkin
    }
  }
  const lastCheckinDate = getStartOfDay(sortedCheckins[0].checkin_date);
  return { streak, lastCheckinDate };
}

function calculateChallengeStats(checkins) {
  if (!checkins || checkins.length === 0) {
    return {
      total_completed_days: 0,
      current_day: 1,
      completion_percentage: 0,
      days_remaining: 75,
      total_checkins: 0,
      checkin_dates: [],
    };
  }
  const total_completed_days = checkins.filter(
    (checkin) => checkin.all_habits_completed,
  ).length;
  const current_day = total_completed_days + 1;
  const completion_percentage = (total_completed_days / 75) * 100;
  const total_checkins = checkins.length;
  const days_remaining = 75 - total_completed_days;
  const checkin_dates = checkins.map((checkin) =>
    getStartOfDay(checkin.checkin_date),
  );
  return {
    total_completed_days: total_completed_days,
    current_day: current_day,
    completion_percentage: completion_percentage,
    days_remaining: days_remaining,
    total_checkins: total_checkins,
    checkin_dates: checkin_dates,
  };
}

export function createDailyCheckins(prisma) {
  // Validate that the user is authenticated
  const router = express.Router();
  router.post("/:id", authenticateMiddleware, async (req, res) => {
    const userId = req.user.id;
    const challengeId = parseInt(req.params.id, 10);
    if (isNaN(challengeId)) {
      return res.status(400).json({
        error: { message: "Invalid challenge ID" },
      });
    }

    try {
      const challenge = await prisma.challenges.findUnique({
        where: { id: challengeId },
      });
      if (!challenge) {
        return res.status(404).json({
          error: {
            message: "Unable to create checkin for non existant challenge",
          },
        });
      }
      if (challenge.user_id !== userId) {
        return res.status(403).json({
          error: {
            message: "User is not authorized to access given challenge data",
          },
        });
      }
      if (challenge.status !== "active") {
        return res.status(400).json({
          error: {
            message: "Unable to access checkins for non active challenges",
          },
        });
      }
      const currentDay = challenge.current_day;
      // check for existing checkin today
      const lastCheckIn = await prisma.daily_checkins.findFirst({
        where: { challenge_id: challenge.id, all_habits_completed: true },
        orderBy: {
          day_number: "desc",
        },
      });
      // verify that there is no gap in the checkins (ie user can't create day 3 checkin if day 2 is missing)
      const expectedDay =
        Math.floor(
          getStartOfDay(new Date()).getTime() / (1000 * 60 * 60 * 24),
        ) -
        Math.floor(challenge.created_at.getTime() / (1000 * 60 * 60 * 24)) +
        1;
      const gap = expectedDay - lastCheckIn?.day_number || 1;
      if (gap > 1) {
        // This means the user is trying to create a checkin for a day that is more than 1 day ahead of their current day, which indicates they have missed at least one day of checkins
        // Need to set the challenge as failed and return an error asking the user to restart the challenge
        await prisma.challenges.update({
          where: { id: challenge.id },
          data: { status: "failed", completed_at: getStartOfDay(new Date()) },
        });
        return res.status(400).json({
          error: {
            message: `Unable to create checkin for day ${currentDay} because you missed ${gap} days. Challenge has been marked as failed. Please restart the challenge to try again.`,
          },
        });
      }
      if (lastCheckIn.day_number === currentDay) {
        return res.status(200).json({
          message: "Daily checkin already created",
          checkin: lastCheckIn,
        });
      }
      // create daily checkin
      const challenge_habits = await prisma.challenge_habits.findMany({
        where: { challenge_id: challenge.id },
        select: {
          challenge_id: true,
          habit_name: true,
          habit_order: true,
        },
      });
      if (!challenge_habits || challenge_habits.length == 0) {
        return res.status(400).json({
          error: {
            message:
              "Unable to create checkin: challenge has no habits defined",
          },
        });
      }
      // create the checkin with all habits for the day
      const createdCheckin = await prisma.daily_checkins.create({
        data: {
          challenge_id: challenge.id,
          day_number: expectedDay,
          all_habits_completed: false,
          completed_habit_ids: [],
          user_id: userId,
          checkin_date: getStartOfDay(new Date()),
        },
      });
      const updatedCheckin = {
        ...createdCheckin,
        habits: [...challenge_habits],
      };
      return res.status(201).json({
        message: "Daily checkin created",
        checkin: updatedCheckin,
      });
    } catch (error) {
      console.error("Unable to create daily checkin", error);
      return res
        .status(500)
        .json({ error: { message: "Unable to create daily checkin" } });
    }
  });
  router.put("/:checkinId", authenticateMiddleware, async (req, res) => {
    const userId = req.user.id;
    const checkinId = parseInt(req.params.checkinId, 10);
    const { habitId, completed } = req.body;
    if (isNaN(checkinId)) {
      return res.status(400).json({
        error: { message: "Invalid checkin ID" },
      });
    }
    // Validate user input
    if (isNaN(habitId)) {
      return res.status(400).json({
        error: { message: "Need to provide valid habitId" },
      });
    }
    try {
      // Validate that the checkin exists and belongs to the user
      const checkin = await prisma.daily_checkins.findUnique({
        where: { id: checkinId },
        include: {
          challenge: {
            select: {
              id: true,
              status: true,
              current_day: true,
              total_habits: true,
              challenge_habits: {
                select: {
                  id: true,
                  habit_name: true,
                  habit_order: true,
                },
              },
            },
          },
        },
      });
      if (!checkin) {
        return res
          .status(404)
          .json({ error: { message: "Checkin not found" } });
      }
      if (checkin.user_id !== userId) {
        return res.status(403).json({
          error: {
            message: "User is not authorized to access given challenge data",
          },
        });
      }
      //Check that the checkin is for the current day
      const today = getStartOfDay(new Date());
      if (checkin.checkin_date.getTime() !== today.getTime()) {
        return res.status(400).json({
          error: { message: "Can only update checkins for the current day" },
        });
      }

      // Check that the habit exists and belongs to the challenge
      const challengeHabits = checkin.challenge.challenge_habits;

      if (!challengeHabits || challengeHabits.length === 0) {
        return res.status(400).json({
          error: {
            message:
              "Unable to update checkin: challenge has no habits defined",
          },
        });
      }
      if (!challengeHabits.some((habit) => habit.id === habitId)) {
        return res.status(403).json({
          error: { message: "User does not have access to the given habit" },
        });
      }

      // Query the checkin to get the challenge_habits and validate that the challenge is active
      const challenge = checkin.challenge;
      if (challenge.status !== "active") {
        return res.status(400).json({
          error: {
            message: "Unable to update checkin for non active challenges",
          },
        });
      }

      // Update the checkin's completed habits
      const currentCompletedIds = new Set(checkin.completed_habit_ids);
      if (completed) {
        currentCompletedIds.add(habitId);
      } else {
        currentCompletedIds.delete(habitId);
      }
      const updatedCompletedHabits = Array.from(currentCompletedIds);
      const allHabitsCompleted =
        updatedCompletedHabits.length === challengeHabits.length;
      const updatedCheckin = await prisma.daily_checkins.update({
        where: { id: checkinId },
        data: {
          completed_habit_ids: updatedCompletedHabits,
          all_habits_completed: allHabitsCompleted,
          completed_at: allHabitsCompleted ? new Date() : null,
        },
      });
      // If all habits are completed, we can update the challenge's current day and status if needed
      if (allHabitsCompleted) {
        const challengeUpdateData = { current_day: challenge.current_day + 1 };
        if (challenge.current_day + 1 >= 75) {
          challengeUpdateData.status = "completed";
          challengeUpdateData.completed_at = new Date();
        }
        await prisma.challenges.update({
          where: { id: challenge.id },
          data: challengeUpdateData,
        });
      }
      return res.status(200).json({
        message: "Habit completion status updated",
        checkin: {
          id: updatedCheckin.id,
          day_number: updatedCheckin.day_number,
          all_habits_completed: updatedCheckin.all_habits_completed,
          completed_habit_ids: updatedCheckin.completed_habit_ids,
          habits: challengeHabits.map((habit) => ({
            id: habit.id,
            habit_name: habit.habit_name,
            habit_order: habit.habit_order,
          })),
        },
      });
    } catch (error) {
      console.error("Unable to update habit status", error);
      return res
        .status(500)
        .json({ error: { message: "Unable to update habit status" } });
    }
  });
  // Get all check-ins for a challenge with optional filters
  router.get("/:challengeId", authenticateMiddleware, async (req, res) => {
    const userId = req.user.id;
    const challengeId = parseInt(req.params.challengeId, 10);
    const { startDate, endDate, completed } = req.query;
    if (isNaN(challengeId)) {
      return res.status(400).json({
        error: { message: "Invalid challenge ID" },
      });
    }
    try {
      // Validate that the challenge exists and belongs to the user
      const challenge = await prisma.challenges.findUnique({
        where: { id: challengeId, status: "active" },
      });
      if (!challenge) {
        return res
          .status(404)
          .json({ error: { message: "Challenge not found" } });
      }
      if (challenge.user_id !== userId) {
        return res.status(403).json({
          error: {
            message: "User is not authorized to access given challenge data",
          },
        });
      }
      const whereClause = { challenge_id: challengeId };
      if (startDate || endDate) {
        whereClause.checkin_date = {};
        if (startDate) {
          whereClause.checkin_date.gte = new Date(startDate);
        }
        if (endDate) {
          whereClause.checkin_date.lte = new Date(endDate);
        }
      }
      if (completed) {
        whereClause.all_habits_completed = completed === "true";
      }
      const checkins = await prisma.daily_checkins.findMany({
        where: whereClause,
        include: {
          challenge: {
            select: {
              id: true,
              status: true,
              current_day: true,
              total_habits: true,
              challenge_habits: {
                select: {
                  id: true,
                  habit_name: true,
                  habit_order: true,
                },
              },
            },
          },
        },
        orderBy: {
          checkin_date: "desc",
        },
      });
      const streak = calculateStreak(checkins);
      return res.status(200).json({
        message: "Daily checkins retrieved",
        streak: streak,
        checkins: checkins.map((checkin) => ({
          id: checkin.id,
          user_id: checkin.user_id,
          checkin_date: checkin.checkin_date,
          allHabitsCompleted: checkin.all_habits_completed,
          completion_percentage:
            (checkin.completed_habit_ids.length /
              checkin.challenge.total_habits) *
            100,
          challenge: {
            id: checkin.challenge.id,
            status: checkin.challenge.status,
            current_day: checkin.challenge.current_day,
            total_habits: checkin.challenge.total_habits,
            challenge_habits: checkin.challenge.challenge_habits.map(
              (habit) => ({
                id: habit.id,
                habit_name: habit.habit_name,
                habit_order: habit.habit_order,
              }),
            ),
          },
        })),
      });
    } catch (error) {
      console.error("Unable to retrieve daily checkins", error);
      return res
        .status(500)
        .json({ error: { message: "Unable to retrieve daily checkins" } });
    }
  });
  // Get specific day's check-in
  router.get(
    "/:chalengeId/date/:date",
    authenticateMiddleware,
    async (req, res) => {
      const userId = req.user.id;
      const challengeId = parseInt(req.params.challengeId, 10);
      const checkinDate = new Date(req.params.date);
      if (isNaN(challengeId) || isNaN(checkinDate.getTime())) {
        return res.status(400).json({
          error: { message: "Invalid challenge ID or date" },
        });
      }
      try {
        const challenge = await prisma.challenges.findUnique({
          where: { id: challengeId, status: "active" },
        });
        if (!challenge) {
          return res
            .status(404)
            .json({ error: { message: "Challenge not found" } });
        }
        if (challenge.user_id !== userId) {
          return res.status(403).json({
            error: {
              message: "User is not authorized to access given challenge data",
            },
          });
        }
        const checkin = await prisma.daily_checkins.findFirst({
          where: {
            challenge_id: challengeId,
            checkin_date: getStartOfDay(checkinDate),
          },
          include: {
            challenge: {
              select: {
                total_habits: true,
                status: true,
                completed_habit_ids: true,
                all_habits_completed: true,
                challenge_habits: {
                  select: {
                    id: true,
                    habit_name: true,
                    habit_order: true,
                  },
                },
              },
            },
          },
        });
        if (!checkin) {
          return res
            .status(404)
            .json({ error: { message: "Checkin not found for given date" } });
        }
        if (checkin.user_id !== userId) {
          return res.status(403).json({
            error: {
              message: "User is not authorized to access given checkin data",
            },
          });
        }
        return res.status(200).json({
          message: "Daily checkin retrieved",
          checkin: {
            id: checkin.id,
            user_id: checkin.user_id,
            checkin_date: checkin.checkin_date,
            allHabitsCompleted: checkin.all_habits_completed,
            challenge: {
              id: checkin.challenge.id,
              status: checkin.challenge.status,
              current_day: checkin.challenge.current_day,
              total_habits: checkin.challenge.total_habits,
              challenge_habits: checkin.challenge.challenge_habits.map(
                (habit) => ({
                  id: habit.id,
                  habit_name: habit.habit_name,
                  habit_order: habit.habit_order,
                }),
              ),
            },
          },
        });
      } catch (error) {
        console.error("Unable to retrieve daily checkin", error);
        return res
          .status(500)
          .json({ error: { message: "Unable to retrieve daily checkin" } });
      }
    },
  );
  // Get challenge stas
  router.get(
    "/:challengeId/progress",
    authenticateMiddleware,
    async (req, res) => {
      const userId = req.user.id;
      const challengeId = parseInt(req.params.challengeId, 10);
      if (isNaN(challengeId)) {
        return res.status(400).json({
          error: { message: "Invalid challenge ID" },
        });
      }
      try {
        const challenge = await prisma.challenges.findUnique({
          where: { id: challengeId },
        });
        if (!challenge) {
          return res
            .status(404)
            .json({ error: { message: "Challenge not found" } });
        }
        if (challenge.user_id !== userId) {
          return res.status(403).json({
            error: {
              message: "User is not authorized to access given challenge data",
            },
          });
        }
        const checkins = await prisma.daily_checkins.findMany({
          where: { challenge_id: challengeId },
        });
        if (checkins.user_id !== userId) {
          return res.status(403).json({
            error: {
              message: "User is not authorized to access given checkin data",
            },
          });
        }
        const stat = calculateStreak;
        return res.status(200).json({
          message: "Challenge progress retrieved",
          progress: stat,
        });
      } catch (error) {
        console.error("Unable to retrieve challenge progress", error);
        return res.status(500).json({
          error: { message: "Unable to retrieve challenge progress" },
        });
      }
    },
  );
  return router;
}
