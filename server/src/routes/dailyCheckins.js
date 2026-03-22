import express from "express";
import { getStartOfDay, isToday } from "../utils/dateHelpers.js";
import { authenticateMiddleware } from "../middleware/authenticateMiddleware.js";

export function createDailyCheckinsRoutes(prisma) {
  const router = express.Router();
  /* Get/create  daily checkin for a challenge */
  router.get(
    "/:challengeId/today",
    authenticateMiddleware,
    async (req, res) => {
      const userId = req.user.id;
      const challengeId = req.params.challengeId;
      if (isNaN(challengeId)) {
        return res.status(400).json({
          error: { message: "Invalid challenge ID" },
        });
      }
      try {
        // find the challenge and make sure it belongs to the user
        const challenge = await prisma.challenges.findFirst({
          where: { id: challengeId, user_id: userId, status: "active" },
        });

        if (!challenge) {
          return res
            .status(404)
            .json({ error: { message: "Challenge not found" } });
        }
        const currentDay = challenge.current_day;
        // check for existing checkin today
        const lastCheckIn = await prisma.daily_checkins.findFirst({
          where: { challenge_id: challenge.id },
          orderBy: { day_number: "desc" },
        });

        if (lastCheckIn && isToday(lastCheckIn.checkin_date)) {
          return res.status(200).json({
            message: "Daily checkin already created",
            checkin: lastCheckIn,
          });
        }
        // if no checkin for today, create one for the current day
        const daysSinceStart = Math.floor(
          (getStartOfDay(new Date()) - getStartOfDay(challenge.start_date)) /
            (1000 * 60 * 60 * 24),
        );
        const lastCheckedDay = lastCheckIn ? lastCheckIn.day_number : 1;

        if (lastCheckedDay + 1 !== daysSinceStart) {
          // calculate the gap between the expected day and the current day
          const gap = daysSinceStart - currentDay;

          if (gap > 0) {
            await prisma.challenges.update({
              where: { id: challenge.id },
              data: {
                status: "failed",
                completed_at: getStartOfDay(lastCheckIn.checkin_date),
              },
            });
            return res.status(400).json({
              error: {
                message: `Unable to create checkin for day ${currentDay} because you missed ${gap} days. Challenge has been marked as failed. Please restart the challenge to try again.`,
              },
            });
          } else if (gap < 0) {
            return res.status(200).json({
              message: `All tasks completed for day ${daysSinceStart}. Return tomorrow for next daily challenge`,
            });
          }
        }
        // if the expected day matches the current day, create the checkin
        // check the challenge contains any habits
        const challenge_habits = await prisma.challenge_habits.findMany({
          where: { challenge_id: challenge.id },
          select: {
            challenge_id: true,
            habit_name: true,
            habit_order: true,
          },
        });
        if (!challenge_habits || challenge_habits.length === 0) {
          console.log("challenge_habits", challenge_habits);
          return res.status(400).json({
            error: {
              message:
                "Unable to create checkin: challenge has no habits defined",
            },
          });
        }
        const createdCheckin = await prisma.daily_checkins.create({
          data: {
            challenge_id: challenge.id,
            day_number: currentDay,
            all_habits_completed: false,
            completed_habit_ids: [],
            user_id: userId,
            checkin_date: getStartOfDay(new Date()),
          },
        });
        const updateCheckin = {
          ...createdCheckin,
          habits: [...challenge_habits],
        };
        return res.status(201).json({
          message: "Daily checkin created",
          checkin: updateCheckin,
        });
      } catch (error) {
        console.error("Unable to create daily checkin", error);
        return res
          .status(500)
          .json({ error: { message: "Unable to create daily checkin" } });
      }
    },
  );
  router.put("/:checkinId", authenticateMiddleware, async (req, res) => {
    const userId = req.user.id;
    const checkinId = parseInt(req.params.checkinId, 10);
    const { habitId, completed } = req.body;
    if (isNaN(checkinId)) {
      return res.status(400).json({
        error: { message: "Invalid checkin ID" },
      });
    }
    if (isNaN(habitId)) {
      return res
        .status(400)
        .json({ error: { message: "Need to provide valid habitId" } });
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
      // Check that the challenge status is active
      if (checkin.challenge.status !== "active") {
        return res.status(400).json({
          error: {
            message: "Unable to update checkin for non active challenges",
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
      // Check that the challenge has habits defined
      if (checkin.challenge.challenge_habits.length === 0) {
        return res.status(400).json({
          error: {
            message:
              "Unable to update checkin: challenge has no habits defined",
          },
        });
      }

      // Check that the habit exists and belongs to the challenge
      const challengeHabits = checkin.challenge.challenge_habits;

      if (!challengeHabits.some((habit) => habit.id === habitId)) {
        return res.status(403).json({
          error: { message: "User does not have access to the given habit" },
          details: {
            habit_id: habitId,
            challenge_id: checkin.challenge.id,
          },
        });
      }
      // Query the checkin to get the challenge_habits and validate that the challenge is active

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
        const challengeUpdateData = {
          current_day: checkin.challenge.current_day + 1,
        };
        if (checkin.challenge.current_day + 1 >= 75) {
          challengeUpdateData.status = "completed";
          challengeUpdateData.completed_at = new Date();
        }
        await prisma.challenges.update({
          where: { id: checkin.challenge.id },
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
  router.get("/:challengeId/date", authenticateMiddleware, async (req, res) => {
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
      if (completed !== undefined) {
        whereClause.allHabitsCompleted = completed === "true";
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
      return res.status(200).json({
        message: "Daily checkin retrieved",
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
  router.get(
    "/:challengeId/date/:date",
    authenticateMiddleware,
    async (req, res) => {
      const userId = req.user.id;
      const challengeId = parseInt(req.params.challengeId, 10);
      const checkinDate = new Date(req.params.date);
      if (isNaN(challengeId)) {
        return res.status(400).json({
          error: { message: "Invalid challenge ID" },
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
            all_habits_completed: checkin.all_habits_completed,
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
          .json({
            error: {
              message: `Unable to retrieve daily checkin for ${checkinDate}`,
            },
          });
      }
    },
  );
  return router;
}
