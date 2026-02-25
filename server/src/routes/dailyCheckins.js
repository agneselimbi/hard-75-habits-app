import express from "express";

import { getStartOfDay} from "../utils/dateHelpers.js";
import { authenticateMiddleware } from "../middleware/authenticateMiddleware.js";


export function createDailyCheckins(prisma){
    // Validate that the user is authenticated
    const router = express.Router();
    router.post("/:id", authenticateMiddleware, async (req, res) => {
        const userId = req.user.id;
        const challengeId = parseInt(req.params.id,10);
        if (isNaN(challengeId)) {
            return res.status(400).json({ 
            error: { message: "Invalid challenge ID" } 
        });
        }
   
    try {
        const challenge = await prisma.challenges.findUnique({
            where: { id: challengeId },
        });
        if (!challenge) {
            return res.status(404).json({ error: {message: "Unable to create checkin for non existant challenge" }});
        }
        if (challenge.user_id !== userId) {
            return res.status(403).json({ error: { message: "User is not authorized to access given challenge data"} });
        }
        if (challenge.status !== "active") {
            return res.status(400).json({ error: {message: "Unable to access checkins for non active challenges"}});
        }
        const currentDay = challenge.current_day;
        // check for existing checkin today 
        const existingCheckin = await prisma.daily_checkins.findFirst({
                                where: { challenge_id: challenge.id, day_number : currentDay},
                                orderBy: {
                                    day_number: 'desc',
                                },
                            });
        if (existingCheckin){
            return res.status(200).json({ 
             message: "Daily checkin already created", 
             checkin: existingCheckin
        });
        }
        // create daily checkin    
        const challenge_habits = await prisma.challenge_habits.findMany({
            where : {challenge_id:challenge.id},
            select : {
                challenge_id: true,
                habit_name: true,
                habit_order: true
            }
        })
        if(!challenge_habits || challenge_habits.length == 0){
            return res.status(400).json({error:{
                message: "Unable to create checkin: challenge has no habits defined"
            }})
        }
        const createdCheckin = await prisma.daily_checkins.create({
            data: {
                challenge_id: challenge.id, 
                day_number: currentDay, 
                all_habits_completed: false,
                completed_habit_ids: [],
                user_id: userId,
                checkin_date: getStartOfDay(new Date())
            }
        })
        const updatedCheckin = {...createdCheckin, habits : [...challenge_habits]}
         return res.status(201).json({  
            message: "Daily checkin created", 
            checkin: updatedCheckin 
        });          
        
    } catch (error) {
        console.error("Unable to create daily checkin", error);
        return res.status(500).json({error: {message: "Unable to create daily checkin"}})
    }
     });
     router.put("/:checkinId", authenticateMiddleware, async (req, res) => {
        const userId = req.user.id;
        const checkinId = parseInt(req.params.checkinId,10);
        const {habitId, completed } = req.body;
        if (isNaN(checkinId)) {
            return res.status(400).json({ 
            error: { message: "Invalid checkin ID" } 
        });
        }
        // Validate user input
        if(isNaN(habitId)){
            return res.status(400).json({
                error: { message : "Need to provide valid habitId"}
            })
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
                                                                habit_order: true
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        });
            if (!checkin) {
                return res.status(404).json({ error: { message: "Checkin not found" } });
            }   
            if (checkin.user_id !== userId){
                return res.status(403).json({error: {
                    message: "User is not authorized to access given challenge data"
                }})
            }
            //Check that the checkin is for the current day
            const today = getStartOfDay(new Date());
            if (checkin.checkin_date.getTime() !== today.getTime()){
                return res.status(400).json({error: {message:"Can only update checkins for the current day"}})
            }

            // Check that the habit exists and belongs to the challenge
            const challengeHabits = checkin.challenge.challenge_habits;
            
            if (!challengeHabits || challengeHabits.length === 0) { 
                return res.status(400).json({ error: { message: "Unable to update checkin: challenge has no habits defined" } });
            }
            if (!challengeHabits.some(habit => habit.id === habitId)) {
                return res.status(403).json({ error: { message: "User does not have access to the given habit" } });
            }
            
            // Query the checkin to get the challenge_habits and validate that the challenge is active
            const challenge = checkin.challenge;
            if (challenge.status !== "active") {
                return res.status(400).json({ error: {message: "Unable to update checkin for non active challenges"}});
            }

            // Update the checkin's completed habits
            const currentCompletedIds = new Set(checkin.completed_habit_ids);
            if (completed) {
                currentCompletedIds.add(habitId);
            } else {
                currentCompletedIds.delete(habitId);
            }
            const updatedCompletedHabits = Array.from(currentCompletedIds);
            const allHabitsCompleted = updatedCompletedHabits.length === challengeHabits.length;
            const updatedCheckin = await prisma.daily_checkins.update({
                where : { id : checkinId},
                data : {
                    completed_habit_ids: updatedCompletedHabits,
                    all_habits_completed: allHabitsCompleted
                }
            })
            // If all habits are completed, we can update the challenge's current day and status if needed
            if (allHabitsCompleted){
                const challengeUpdateData = { current_day: challenge.current_day + 1 };
                if (challenge.current_day + 1 >= 75 ){
                    challengeUpdateData.status = "completed";
                    challengeUpdateData.completed_at = new Date();
                }
            await prisma.challenges.update({
                    where: { id: challenge.id },
                    data: challengeUpdateData
                })
            }
            return res.status(200).json({
                message: "Habit completion status updated",
                checkin: {
                    id: updatedCheckin.id,
                    day_number: updatedCheckin.day_number,
                    all_habits_completed: updatedCheckin.all_habits_completed,
                    completed_habit_ids: updatedCheckin.completed_habit_ids,
                    habits: challengeHabits.map(habit => ({
                        id: habit.id,
                        habit_name: habit.habit_name,  
                        habit_order: habit.habit_order
                    }))
                }
            })

     } catch(error){
        console.error("Unable to update habit status", error);
        return res.status(500).json({error: {message: "Unable to update habit status"}})
     }
})
    return router;
}