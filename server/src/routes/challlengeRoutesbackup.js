import express from "express"
import { authenticateMiddleware } from "../middleware/authenticateMiddleware";

export function createChallengeRoutes(prisma) {
    const router = express.Router();
    
    // ✅ Specific routes FIRST
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
                    current_day: true
                },
                orderBy: { created_at: 'desc' }
            });
            
            res.status(200).json({
                message: `Returned challenges from ${req.user.id}`,
                data: userChallenges
            });
        } catch (error) {
            console.error(`Unable to find challenges for user with id: ${req.user.id}`);
            res.status(500).json({
                error: { message: "Unable to retrieve challenges" }
            });
        }
    });
    
    router.post("/create", authenticateMiddleware, async (req, res) => {
        const { challenge_name, total_habits } = req.body;
        
        try {
            const existingChallenge = await prisma.challenges.findFirst({
                where: {
                    user_id: req.user.id,
                    status: "active"
                }
            });
            
            if (existingChallenge) {
                return res.status(409).json({
                    error: { message: `User with id ${req.user.id} is already participating in a challenge` }
                });
            }
            
            if (!total_habits || !challenge_name || challenge_name.length < 1) {
                return res.status(400).json({
                    error: { message: "Challenge Name and Total Habits are required" }
                });
            }
            
            const isNumeric = (val) => !isNaN(parseFloat(val)) && isFinite(val);
            if (!isNumeric(total_habits)) {
                return res.status(400).json({
                    error: { message: "total Habits should be an integer" }
                });
            }
            
            if (total_habits < 1 || total_habits > 10) {
                return res.status(400).json({
                    error: { message: "Total habits should be between 1 and 10" }
                });
            }
            
            const createdChallenge = await prisma.challenges.create({
                data: {
                    challenge_name: challenge_name,
                    total_habits: total_habits,
                    challenge_owner: {
                        connect: { id: req.user.id }
                    }
                }
            });
            
            return res.status(201).json({
                data: {
                    id: createdChallenge.id,
                    challenge_name: createdChallenge.challenge_name,
                    user_id: createdChallenge.user_id,
                    start_date: createdChallenge.start_date,
                    total_habits: createdChallenge.total_habits,
                    current_day: 1
                }
            });
            
        } catch (error) {
            console.error("Unable to create new challenge", error.message);
            
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P1001") {
                    return res.status(503).json({
                        error: { message: "Database connection lost" }
                    });
                }
            }
            
            return res.status(500).json({
                error: { message: "Unable to create new challenge" }
            });
        }
    });
    console.log("✅ Challenge routes being registered");
       
    router.post("/:id/habits", authenticateMiddleware, async (req, res) => {
        console.log("🎯 HIT POST /:id/habits");
        console.log("Params:", req.params);
        console.log("Path:", req.path);
        const challenge_id = parseInt(req.params.id, 10);
        
        if (isNaN(challenge_id)) {
            return res.status(400).json({
                error: { message: "Need to provide a valid challenge id" }
            });
        }
        
        const habits = req.body;
        
        if (!habits || habits.length === 0) {
            return res.status(400).json({
                error: { message: "Need to provide habits for the challenge" }
            });
        }
        
        const allValidHabitNames = habits.every(
            habit => habit.habit_name && habit.habit_name.trim() !== ""
        );
        
        if (!allValidHabitNames) {
            return res.status(400).json({
                error: { message: "Missing or empty habit name found" }
            });
        }
        
        try {
            const challenge = await prisma.challenges.findFirst({
                where: { id: challenge_id },
                include: {
                    challenge_habits: {
                        select: { habit_name: true, habit_order: true },
                        orderBy: { habit_order: 'desc' }
                    }
                }
            });
            
            if (!challenge) {
                return res.status(404).json({
                    error: { message: "Challenge not found" }
                });
            }
            
            if (challenge.user_id !== req.user.id) {
                return res.status(403).json({
                    error: { message: "User is not authorized to access given challenge data" }
                });
            }
            
            if (challenge.status !== "active") {
                return res.status(400).json({
                    error: { message: "Can't add habits to inactive challenges" }
                });
            }
            
            if (challenge.total_habits !== habits.length) {
                return res.status(400).json({
                    error: { message: "Habits provided do not match the total habits from the challenge" }
                });
            }
            
            const existingHabits = await prisma.challenge_habits.findMany({
                where: { challenge_id: challenge_id }
            });
            
            if (existingHabits.length > 0) {
                return res.status(409).json({
                    error: { message: "Habits already added to the challenge" }
                });
            }
            
            const createdHabits = await prisma.challenge_habits.createMany({
                data: habits.map((habit, index) => ({
                    habit_name: habit.habit_name,
                    habit_order: index + 1,
                    challenge_id: challenge_id
                }))
            });
            
            return res.status(201).json({
                message: `Successfully created ${challenge.total_habits} habits`,
                data: createdHabits
            });
            
        } catch (error) {
            console.error("Unable to add challenge habits", error);
            return res.status(500).json({
                error: { message: "Unable to add habits to the challenge" }
            });
        }
    });
    
    router.put("/:challengeId/habits/:habitId", authenticateMiddleware, async (req, res) => {
        const challengeId = parseInt(req.params.challengeId, 10);
        
        if (isNaN(challengeId)) {
            return res.status(400).json({
                error: { message: "Need to provide a valid challenge id" }
            });
        }
        
        const habitId = parseInt(req.params.habitId, 10);
        
        if (isNaN(habitId)) {
            return res.status(400).json({
                error: { message: "Need to provide a valid habit id" }
            });
        }
        
        const updatedHabitName = req.body.habit_name;
        
        if (!updatedHabitName || updatedHabitName.trim().length === 0) {
            return res.status(400).json({
                error: { message: "Need to provide a valid habit name" }
            });
        }
        
        try {
            const habit = await prisma.challenges.findFirst({
                where: { id: challengeId },
                include: {
                    challenge_habits: {
                        where: { id: habitId },
                        select: { habit_name: true, habit_order: true }
                    }
                }
            });
            
            if (!habit) {
                return res.status(404).json({
                    error: { message: "Habit not found" }
                });
            }
            
            if (habit.current_day > 1) {
                return res.status(400).json({
                    error: { message: "Unable to modify habit name beyond day 1" }
                });
            }
            
            if (habit.user_id !== req.user.id) {
                return res.status(403).json({
                    error: { message: "User is not authorized to access given challenge data" }
                });
            }
            
            const updatedHabit = await prisma.challenge_habits.update({
                where: { id: habitId },
                data: { habit_name: updatedHabitName }
            });
            
            return res.status(200).json({
                message: "Successfully updated habit name",
                data: updatedHabit
            });
            
        } catch (error) {
            console.error("Failed to update habit name", error.message);
            return res.status(500).json({
                error: { message: "Unable to update habit name" }
            });
        }
    });
    
    router.get("/:id", authenticateMiddleware, async (req, res) => {
        const challenge_id = parseInt(req.params.id, 10);
        
        if (isNaN(challenge_id)) {
            return res.status(400).json({
                error: { message: "Need to provide a valid challenge id" }
            });
        }
        
        try {
            const challenge = await prisma.challenges.findFirst({
                where: { id: challenge_id },
                include: {
                    challenge_habits: {
                        select: {
                            habit_name: true,
                            habit_order: true
                        },
                        orderBy: { habit_order: 'desc' }
                    }
                }
            });
            
            if (!challenge) {
                return res.status(404).json({
                    error: { message: "Challenge not found" }
                });
            }
            
            if (challenge.user_id !== req.user.id) {
                return res.status(403).json({
                    error: { message: "User is not authorized to access given challenge data" }
                });
            }
            
            return res.status(200).json({
                message: `Listing challenge with id ${challenge_id}`,
                data: challenge
            });
            
        } catch (error) {
            console.error("Unable to find challenge data", error);
            return res.status(500).json({
                error: { message: `Unable to find data for challenge with id: ${challenge_id}` }
            });
        }
    });

    return router;
}