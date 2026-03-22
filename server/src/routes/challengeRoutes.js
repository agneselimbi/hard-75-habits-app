import express from "express";

import { authenticateMiddleware } from "../middleware/authenticateMiddleware.js";

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

export function createChallengeRoutes(prisma) {
  const router = express.Router();

  router.get("/list", authenticateMiddleware, async (req, res) => {
    try {
      const userChallenges = await prisma.challenges.findMany({
        where: { user_id: req.user.id },
        select: {
          id: true,
          challenge_name: true,
          total_habits: true,
          user_id: true,
          status: true,
          current_day: true,
        },
        orderBy: { created_at: "desc" },
      });

      res.status(200).json({
        message: `Returned challenges from ${req.user.id}`,
        data: userChallenges,
      });
    } catch (error) {
      console.error(
        `Unable to find challenges for user with id: ${req.user.id}`,
      );
      res.status(500).json({
        error: { message: "Unable to retrieve challenges" },
      });
    }
  });

  router.post("/create", authenticateMiddleware, async (req, res) => {
    const { challenge_name, total_habits } = req.body;

    try {
      const existingChallenge = await prisma.challenges.findFirst({
        where: {
          user_id: req.user.id,
          status: "active",
        },
      });

      if (existingChallenge) {
        return res.status(409).json({
          error: {
            message: `User with id ${req.user.id} is already participating in a challenge`,
          },
        });
      }

      if (!total_habits || !challenge_name || challenge_name.length < 1) {
        return res.status(400).json({
          error: { message: "Challenge Name and Total Habits are required" },
        });
      }

      const isNumeric = (val) => !isNaN(parseFloat(val)) && isFinite(val);
      if (!isNumeric(total_habits)) {
        return res.status(400).json({
          error: { message: "total Habits should be an integer" },
        });
      }

      if (total_habits < 1 || total_habits > 10) {
        return res.status(400).json({
          error: { message: "Total habits should be between 1 and 10" },
        });
      }

      const createdChallenge = await prisma.challenges.create({
        data: {
          challenge_name: challenge_name,
          total_habits: total_habits,
          challenge_owner: {
            connect: { id: req.user.id },
          },
        },
      });

      return res.status(201).json({
        data: {
          id: createdChallenge.id,
          challenge_name: createdChallenge.challenge_name,
          user_id: createdChallenge.user_id,
          start_date: createdChallenge.start_date,
          total_habits: createdChallenge.total_habits,
          current_day: 1,
        },
      });
    } catch (error) {
      console.error("Unable to create new challenge", error.message);
      return res.status(500).json({
        error: { message: "Unable to create new challenge" },
      });
    }
  });

  router.post("/:id/habits", authenticateMiddleware, async (req, res) => {
    const challenge_id = parseInt(req.params.id, 10);
    if (isNaN(challenge_id)) {
      return res.status(400).json({
        error: { message: "Need to provide a valid challenge id" },
      });
    }
    const habits = req.body;

    if (!habits || habits.length === 0) {
      return res.status(400).json({
        error: { message: "Need to provide habits for the challenge" },
      });
    }

    const allValidHabitNames = habits.every(
      (habit) => habit.habit_name && habit.habit_name.trim() !== "",
    );

    if (!allValidHabitNames) {
      return res.status(400).json({
        error: { message: "Missing or empty habit name found" },
      });
    }

    try {
      const challenge = await prisma.challenges.findFirst({
        where: { id: challenge_id },
        include: {
          challenge_habits: {
            select: { habit_name: true, habit_order: true },
            orderBy: { habit_order: "desc" },
          },
        },
      });

      if (!challenge) {
        return res.status(404).json({
          error: { message: "Challenge not found" },
        });
      }

      if (challenge.user_id !== req.user.id) {
        return res.status(403).json({
          error: {
            message: "User is not authorized to access given challenge data",
          },
        });
      }

      if (challenge.status !== "active") {
        return res.status(400).json({
          error: { message: "Can't add habits to inactive challenges" },
        });
      }

      if (challenge.total_habits !== habits.length) {
        return res.status(400).json({
          error: {
            message:
              "Habits provided do not match the total habits from the challenge",
          },
        });
      }

      const existingHabits = await prisma.challenge_habits.findMany({
        where: { challenge_id: challenge_id },
      });

      if (existingHabits?.length > 0) {
        return res.status(409).json({
          error: { message: "Habits already added to the challenge" },
        });
      }

      const createdHabits = await prisma.challenge_habits.createMany({
        data: habits.map((habit, index) => ({
          habit_name: habit.habit_name,
          habit_order: index + 1,
          challenge_id: challenge_id,
        })),
      });

      return res.status(201).json({
        message: `Successfully created ${challenge.total_habits} habits`,
        data: createdHabits,
      });
    } catch (error) {
      console.error("Unable to add challenge habits", error);
      return res.status(500).json({
        error: { message: "Unable to add habits to the challenge" },
      });
    }
  });

  router.put(
    "/:challengeId/habits/:habitId",
    authenticateMiddleware,
    async (req, res) => {
      const challengeId = parseInt(req.params.challengeId, 10);

      if (isNaN(challengeId)) {
        return res.status(400).json({
          error: { message: "Need to provide a valid challenge id" },
        });
      }

      const habitId = parseInt(req.params.habitId, 10);

      if (isNaN(habitId)) {
        return res.status(400).json({
          error: { message: "Need to provide a valid habit id" },
        });
      }

      const updatedHabitName = req.body.habit_name;

      if (!updatedHabitName || updatedHabitName.trim().length === 0) {
        return res.status(400).json({
          error: { message: "Need to provide a valid habit name" },
        });
      }

      try {
        const habit = await prisma.challenges.findFirst({
          where: { id: challengeId },
          include: {
            challenge_habits: {
              where: { id: habitId },
              select: { habit_name: true, habit_order: true },
            },
          },
        });

        if (!habit) {
          return res.status(404).json({
            error: { message: "Habit not found" },
          });
        }

        if (habit.current_day > 1) {
          return res.status(400).json({
            error: { message: "Unable to modify habit name beyond day 1" },
          });
        }

        if (habit.user_id !== req.user.id) {
          return res.status(403).json({
            error: {
              message: "User is not authorized to access given challenge data",
            },
          });
        }

        const updatedHabit = await prisma.challenge_habits.update({
          where: { id: habitId },
          data: { habit_name: updatedHabitName },
        });

        return res.status(200).json({
          message: "Successfully updated habit name",
          data: updatedHabit,
        });
      } catch (error) {
        console.error("Failed to update habit name", error.message);
        return res.status(500).json({
          error: { message: "Unable to update habit name" },
        });
      }
    },
  );

  router.get("/:id", authenticateMiddleware, async (req, res) => {
    const challenge_id = parseInt(req.params.id, 10);

    if (isNaN(challenge_id)) {
      return res.status(400).json({
        error: { message: "Need to provide a valid challenge id" },
      });
    }

    try {
      const challenge = await prisma.challenges.findFirst({
        where: { id: challenge_id },
        include: {
          challenge_habits: {
            select: {
              habit_name: true,
              habit_order: true,
            },
            orderBy: { habit_order: "desc" },
          },
        },
      });

      if (!challenge) {
        return res.status(404).json({
          error: { message: "Challenge not found" },
        });
      }

      if (challenge.user_id !== req.user.id) {
        return res.status(403).json({
          error: {
            message: "User is not authorized to access given challenge data",
          },
        });
      }

      return res.status(200).json({
        message: `Listing challenge with id ${challenge_id}`,
        data: challenge,
      });
    } catch (error) {
      console.error("Unable to find challenge data", error);
      return res.status(500).json({
        error: {
          message: `Unable to find data for challenge with id: ${challenge_id}`,
        },
      });
    }
  });

  router.get(
    "/:challenge_id/progress",
    authenticateMiddleware,
    async (req, res) => {
      const userId = req.user.id;
      const challengeId = parseInt(req.params.challenge_id, 10);
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
        const stat = calculateChallengeStats();
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
