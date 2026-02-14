import express from "express"
import { authenticateMiddleware } from "../middleware/authenticateMiddleware";

export function createChallengeRoutes(prisma) {
    const router = express.Router();    
    // Define challenge routes here
    router.get("/list", authenticateMiddleware, async (req, res) => {
        try {
        const userChallenges = await prisma.challenges.findMany({
            where:{user_id : req.user.id}, 
            select:{
                id:true,
                challenge_name:true, 
                total_habits:true,
                user_id:true,
                status: true,
                current_day:true
            },
            orderBy:{
                created_at: 'desc'
            }
        });
        res.status(200).json({message:`Returned challenges from ${req.user.id}`, data: [...userChallenges]
        })
        } catch (error) {
            console.error(`Unable to find challenges for user with id: ${req.user.id}`);
            res.status(500).json({error:{message:"Unable to retrieve challenges"}})
        }
        
    });
    router.post("/create", authenticateMiddleware, async (req, res) => {
       const {challenge_name, total_habits} = req.body ;
        try{
        // check if any active challenge 
        const existingChallenge = await prisma.challenges.findFirst({
           where:  {user_id: req.user.id, 
                    status: "active"}
        })
        if (existingChallenge){
            console.error(`User with id ${req.user.id} is already participating in a challenge`);
            return res.status(409).json({error:{message: `User with id ${req.user.id} is already participating in a challenge`}})
        }
        // validate challenge inputs
        if (!total_habits || !challenge_name|| challenge_name?.length<1){
            return res.status(400).json({error:{
                message: "Challenge Name and Total Habits are required"}
            })
        }
        const isNumeric = (val) => !isNaN(parseFloat(val)) && isFinite(val);
        if (!isNumeric(total_habits)){
            return res.status(400).json({error:{
                message: "total Habits should be an integer"}
            })
        }

        if (total_habits<1 || total_habits>10){
            return res.status(400).json({error:{
                message: "Total habits should be between 1 and 10"}
            })
        }
        // create new challenge 
        const createdChallenge = await prisma.challenges.create({
            data:{
                challenge_name: challenge_name, 
                total_habits: total_habits,
                challenge_owner :{
                    connect : { id: req.user.id}
                         }
            }            
        });
        return res.status(201).json({
            data: {
                id: createdChallenge.id,
                challenge_name : createdChallenge.challenge_name, 
                user_id: createdChallenge.user_id,
                start_date: createdChallenge.start_date, 
                total_habits: createdChallenge.total_habits, 
                current_day: 1
            }
        })
        // on succes return created challenge
     }catch(error){
        console.error("Unable to create new challenge", error.message);
        if (error instanceof Prisma.PrismaClientKnownRequestError){
            if (error.code == "P1001"){
                return res.status(503).json({error:{
                    message: "Database connection lost"
                }})
            }
        }
        return res.status(500).json({error:{message: "Unable to create new challenge"}})
     }
    })
    router.get("/:id", authenticateMiddleware, async (req,res) => {
        // Validate inputs 
        const challenge_id = parseInt(req.params.id,10);
        console.log("challenge_id from params", challenge_id);
        if(isNaN(challenge_id)){
            return res.status(400).json({error:{
                message: `Need to provide a valid challenge id`
            }})
        }
        try {            
            const challenge = await prisma.challenges.findFirst(
                {
                    where: {
                        id: challenge_id
                    },
                    include: {
                        challenge_habits : {
                            select: {
                                habit_name:true, 
                                habit_order: true
                            },
                            orderBy : {
                                habit_order: 'desc'
                            }
                        }
                    }
                });    
            // Check if challenge exists
            if (!challenge) {
            return res.status(404).json({
                error: { message: "Challenge not found" }
            });
            }

            // Check if the challenge returned belongs to the user 
            if (challenge.user_id !== req.user.id) {
                return res.status(403).json({
                    error: { message: "User is not authorized to access given challenge data"}
                })
            }

            return res.status(200).json({
                message: `Listing challenge with id ${challenge_id}`,
                data : challenge
            });
            
        } catch (error) {
            console.error(`Unable to find challenge data`, error);
            return res.status(500).json({error: {
                message: `Unable to find data for challenge with id : ${challenge_id}`
            }})
        }
    })
    
    router.post("/:id/habits", authenticateMiddleware,async (req,res) => {
        // verify challenges 
        const challenge_id = parseInt(req.params.id,10);
        console.log("challenge_id from params", challenge_id);
        if(isNaN(challenge_id)){
            return res.status(400).json({error:{
                message: `Need to provide a valid challenge id`
            }})
        }    
        const habits = req.body;
        if (!habits|| habits.length === 0){
            return res.status(400).json({error:{
                message: "Need to provide habits for the challenge"
            }})
        } 
        const allValidHabitNames = habits.every(habit => habit.habit_name && habit.habit_name.trim() !== "")
        if (!allValidHabitNames){
            return res.status(400).json({error:{
                message: "Missing or empty habit name found"
            }})
        }
  
        try {            
            const challenge = await prisma.challenges.findFirst(
                {
                    where: {
                        id: challenge_id
                    },
                    include: {
                        challenge_habits : {
                            select: {
                                habit_name:true, 
                                habit_order: true
                            },
                            orderBy : {
                                habit_order: 'desc'
                            }
                        }
                    }
                });   
                
            console.log("Challenge", challenge)    
            // Check if challenge exists
            if (!challenge) {
            return res.status(404).json({
                error: { message: "Challenge not found" }
            });
            }

            // Check if the challenge returned belongs to the user 
            if (challenge.user_id !== req.user.id) {
                return res.status(403).json({
                    error: { message: "User is not authorized to access given challenge data"}
                })
            }
            // check if the challenge is active 
            if (challenge.status !== "active"){
                return res.status(400).json({
                    error:{message: "Can't add habits to inactive challenges"}
                })
            }
            // check if there is a mismatch btwn provided habits and the total habits 
            if (challenge.total_habits !== habits.length){
                return res.status(400).json({
                    error:{message:"Habits provided do not match the total habits from the challenge"}
                })
            }
            // check existing habits 
            const existingHabits = await prisma.challenge_habits.findMany(
                { where : {challenge_id : challenge_id}}
            )
            if (existingHabits){
                return res.status(409).json({error:{
                    message: "Habits already added to the challenge"
                }})
            }
            const createdHabits = await prisma.challenge_habits.createMany({
                habits
            })
            return res.status(201).json({message:`Successfully created ${challenge.total_habits} habits `, data: createdHabits})
        }catch (error) {
            console.error(`Unable to add challenge habits`, error);
            return res.status(500).json({error: {
                message: `Unable to add habits to the challenge`
            }})         
        }
    })     

    return router;
}