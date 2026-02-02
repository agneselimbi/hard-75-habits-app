import request from 'supertest';
import app from '../src/app.js'; 
import createMockPrismaClient from './helpers/mockPrisma.js'
import { createMockUser } from './helpers/testData.js';
import e from 'express';


// Returns 401 without token
// Return 401 with invalid token
// Returns 200 with valid token
// Returns correct user data 
// Doesn't return sensitive data (like password)    

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

describe("Validating challenges route", () => {
    it("should return 401 without token", async() => {
        const response = await request(app).get("/challenges/list");
        expect(response.status).toBe(401);
        expect(response.body.error.message).toBe("No token provided");  
    });
    it("should return 401 with invalid token", async () => { 
        const response = await request(app).get("/challenges/list").set("Authorization", "Bearer invalidtoken");
        expect(response.status).toBe(401);
        expect(response.body.error.message).toBe("Invalid token");
    });   
    it("should return 200 for existing user", async () => {
        const loginResponse = await request(app).post("/auth/login")
            .send({email:"charlie@hard75.com", password:"test1234"});
        const token = loginResponse.body.token;
        expect(token).toBeDefined();
        const response = await request(app)
            .get("/challenges/list")
            .set("Authorization", `Bearer ${token}`);   

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
    },10000);
    it("should not return sensitive data", async() => {
        // Login with valid credentials
        const loginResponse = await request(app).post("/auth/login")
            .send({email:"bob@hard75.com", password:"test1234"});
        const token = loginResponse.body.token;
        expect(token).toBeDefined();
        const response = await request(app)
            .get("/challenges/list")
            .set("Authorization", `Bearer ${token}`);   
        expect(response.status).toBe(200);
        expect (response.body.data.every(challenge => !('password' in challenge))).toBe(true);
    });
    it ("should return data specific to the authenticated user", async () => {
        // Login with valid credentials
        const loginResponse = await request(app).post("/auth/login")
            .send({email:"bob@hard75.com", password:"test1234"});
        const token = loginResponse.body.token;

        const returnedUser = await request(app).get("/users/profile")
        .set("Authorization", `Bearer ${token}`);
        expect(returnedUser.body.user.id).toBeDefined();
        const userId = returnedUser.body.user.id;
        expect(token).toBeDefined();
        const response = await request(app)
            .get("/challenges/list")
            .set("Authorization", `Bearer ${token}`);
        console.log("Challenges response body:", response.body);
        expect (response.body.data.every(challenge => challenge.user_id === userId)).toBe(true);
    });
})