import express from "express";

import { authenticateMiddleware } from "../middleware/authenticateMiddleware.js";

export function createProtectedRoutes(prisma) {
    const router = express.Router();
    router.get("/profile", authenticateMiddleware, async ( req, res) => {
        // Get full user from database 
        const user = await prisma.users.findUnique({
            where: {id:req.user.id}
        })
        res.json({
            user: {
                id: user.id,
                name:user.name,
                email:user.email
            }
        })
    });
    return router;
}