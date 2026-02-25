import express from "express";

import { authenticateMiddleware } from "../middleware/authenticateMiddleware.js";


export function createUserRoutes(prisma) {
    const router = express.Router();
    router.get("/profile", authenticateMiddleware, async ( req, res) => {
        // Get full user from database 
        const user = await prisma.users.findUnique({
            where: {id:req.user.id}
        })
        res.status(200).json({
            user: {
                id: user.id,
                name:user.name,
                email:user.email
            }
        })
    });
    router.put("/profile", authenticateMiddleware, async ( req, res) => {
        try {
        // Update user data in dabase 
        const user = req.user
        const {id, ...updateData} = req.body;

        const cleanData = Object.fromEntries(Object.entries(updateData).filter((_,value) => value != null));
        //Check if user in db 
        const returnedUser = await prisma.users.findUnique({
            where: {id:req.user.id}
        })
        if(!returnedUser){
            console.error(`User with id ${user?.id} not found in DB`);
            throw new Error(`User with id ${user?.id} not found`)
        }
        const updatedUser = await prisma.users.update({
            where:{
                email:user.email
            },
            data : cleanData,
        })
        return res.status(200).json({message:"User profile updated successfully",
        data: {
                id: updatedUser.id,
                name:updatedUser.name,
                email:updatedUser.email
            }
        })
        } catch (error) {
        console.error("Error updating user profile:", error);
        return res.status(500).json({ error: { message: "Failed to update user profile"}});   
        }
      
        
    })
    return router;
}
