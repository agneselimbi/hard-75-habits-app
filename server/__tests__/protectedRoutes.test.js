import express from 'express'
import request from 'supertest';
import { Prisma } from "@prisma/client";

import app from '../src/app.js'; 
import { createChallengeRoutes } from "../src/routes/challengeRoutes.js";
import { createUserRoutes } from '../src/routes/userRoutes.js';
import { createAuthRoutes } from '../src/routes/authRoutes.js';
import{ createMockPrismaClient} from './helpers/mockPrisma.js'
import { createMockUser } from './helpers/testData.js';


describe("Validating the authentication middleware on protected routes", () => {
    it ("Returns 401 without token", async () => {
        const response = await request(app)
            .get("/users/profile");
        expect(response.status).toBe(401);
        expect(response.body.error.message).toBe("No token provided");
    });
    it ("Returns 401 with invalid token", async () => {
        const response = await request(app)
            .get("/users/profile")
            .set("Authorization", "Bearer invalidtoken");
        expect(response.status).toBe(401);
        expect(response.body.error.message).toBe("Invalid token");
    });
    it ('Return 200 with valid token', async () => {

        // Login with valid credentials 
        const loginResponse = await request(app)
            .post("/auth/login")
            .send({email:"bob@hard75.com", password:"test1234"});
        const token = loginResponse.body.token;
        expect(token).toBeDefined();

        // Access protected routes 
        const protectedResponse = await request(app).get("/users/profile").set('Authorization',`Bearer ${token}`).expect(200);
        expect(protectedResponse.body.user.email).toBeDefined();
        expect(protectedResponse.body.user.id).toBeDefined();
        expect(protectedResponse.body.user.password).not.toBeDefined();
    })
});


