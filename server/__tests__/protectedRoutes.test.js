import express from 'express'
import request from 'supertest';
import { Prisma } from "@prisma/client";

import app from '../src/app.js'; 
import { createChallengeRoutes } from "../src/routes/protected.js";
import { createUserRoutes } from '../src/routes/protected.js';
import { createAuthRoutes } from '../src/routes/authRoutes.js';
import{ createMockPrismaClient} from './helpers/mockPrisma.js'
import { createMockUser } from './helpers/testData.js';


describe("Validating get challenge/:id routes", () => {
    let mockapp; 
    let mockPrisma;
    let token;
    let userId;
    beforeAll(async() => {
        mockapp = express();
        mockPrisma = createMockPrismaClient();
        const authRoutes = createAuthRoutes(mockPrisma);
        const challengeRoutes = createChallengeRoutes(mockPrisma);
        const userRoutes = createUserRoutes(mockPrisma);
        mockapp.use(express.json()); // parse json into objects
        mockapp.use("/auth", authRoutes);        
        mockapp.use("/users", userRoutes);
        mockapp.use("/challenges", challengeRoutes);

        // Mock user for both login and profile 
        mockPrisma.users.findUnique.mockResolvedValue({email:"alice@hard75.com", password:"$2b$10$5S.IAkN8GcDG543HHHjW/O.Bh3nTf10Y/kIljDZzG7j6Nl65bk0t.", id:1, name: "Alice"});

        // Login user 
        const loginResp = await request(mockapp).post("/auth/login").send({email:"alice@hard75.com", password:"test1234"});
        
        token = loginResp.body.token;

        // Collect user information 
        const returnedUser = await request(mockapp).get("/users/profile")
        .set("Authorization", `Bearer ${token}`);
            
        userId = returnedUser.body.user.id;
        expect(userId).toBeDefined();
    })

    it("should return 400 if the user input is not integer", async() => {

        const response = await request(mockapp).get("/challenges/'five'").set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe(`Need to provide a valid challenge id`)

    })

    it("user should only have access to their data", async() => {
        mockPrisma.challenges.findFirst.mockResolvedValue({id: 1, challenge_name: "Test challenge", total_habits:5, user_id: userId, status:"failed", current_day: 45, challenge_habits: [{habit_name: "habit 1", habit_order: 1},{habit_name: "habit 2", habit_order: 2}]})
        const response = await request(mockapp).get("/challenges/1").set('Authorization', `Bearer ${token}`);
        console.log(response.body)
        expect(response.status).toBe(200);
        expect(mockPrisma.challenges.findFirst).toHaveBeenCalledWith({
        where: {
            id: 1
        },
        include: {
            challenge_habits: {
                select: {
                    habit_name: true, 
                    habit_order: true
                },
                orderBy: {
                    habit_order: 'desc'
                }
            }
        }
    });


    });

    it("should return 403 if user is trying to accces challenges that don't belong to them", async() => {
        mockPrisma.challenges.findFirst.mockResolvedValue({id: 1, challenge_name: "Test challenge", total_habits:5, user_id: 67, status:"failed", current_day: 45, challenge_habits: [{habit_name: "habit 1", habit_order: 1},{habit_name: "habit 2", habit_order: 2}]})
        const response = await request(mockapp).get("/challenges/1").set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(403);
        console.log(response.body);
        expect(response.body.error.message).toBe("User is not authorized to access given challenge data")
         
    });

    it("should return 404 if challenge is not existing", async () => {
        mockPrisma.challenges.findFirst.mockResolvedValue(null);
        const response = await request(mockapp).get("/challenges/100").set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe("Challenge not found");
    })


    

})



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

describe("Validating list challenges route", () => {
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

describe("Validating create challenges route", () =>{
    let mockapp; 
    let mockPrisma;
    let token;
    let userId;
    let challenge_id
    beforeAll(async() => {
  
        mockapp = express();
        mockPrisma = createMockPrismaClient();
        const authRoutes = createAuthRoutes(mockPrisma);
        const challengeRoutes = createChallengeRoutes(mockPrisma);
        const userRoutes = createUserRoutes(mockPrisma);  // Import this

        mockapp.use(express.json()); // parse json into objects
        mockapp.use("/auth", authRoutes);        
        mockapp.use("/users", userRoutes);
        mockapp.use("/challenges", challengeRoutes);

        // Mock user for both login and profile 
        mockPrisma.users.findUnique.mockResolvedValue({email:"alice@hard75.com", password:"$2b$10$5S.IAkN8GcDG543HHHjW/O.Bh3nTf10Y/kIljDZzG7j6Nl65bk0t.", id:1, name: "Alice"});

        // Login user 
        const loginResp = await request(mockapp).post("/auth/login").send({email:"alice@hard75.com", password:"test1234"});
        
        token = loginResp.body.token;

        // Collect user information 
        const returnedUser = await request(mockapp).get("/users/profile")
        .set("Authorization", `Bearer ${token}`);
            
        userId = returnedUser.body.user.id;
        expect(userId).toBeDefined();
    });
    it("should return 201 if challenge created with appropriate data", async () =>{
        mockPrisma.challenges.create.mockResolvedValue({challenge_name:"Test challenge", total_habits:4, id: 5, user_id: 1, start_date: new Date(), current_day:1})
        const response = await request(mockapp).post("/challenges/create").set('Authorization', `Bearer ${token}`).send({challenge_name: "Test challenge", total_habits:4});

        expect(mockPrisma.challenges.create).toHaveBeenCalledWith({
        data: {
            challenge_name: "Test challenge",
            total_habits: 4,
            challenge_owner: {
                connect: { id: userId }
            }
        }
    });
        expect(response.status).toBe(201);
        expect(response.body.data).toMatchObject({
                id: expect.any(Number),
                challenge_name: "Test challenge",
                total_habits: 4,
                user_id: userId
            });       
    });

    it("should throw error if total habits is absent", async () => {
        mockPrisma.challenges.findFirst.mockResolvedValue(null);
        const response = await request(mockapp).post("/challenges/create").set('Authorization', `Bearer ${token}`).send({challenge_name: "Test challenge", total_habits:""}); 
        expect(response.body.error.message).toBe("Challenge Name and Total Habits are required");
        expect(response.status).toBe(400);
    });
    
    it("should have total habits > 1", async () => {
        const response = await request(mockapp).post("/challenges/create").set('Authorization', `Bearer ${token}`).send({challenge_name: "Test challenge", user_id: 3, total_habits:-1});
        expect(response.body.error.message).toBe("Total habits should be between 1 and 10")
    });
    it("should have total habits < 10", async () => {
        const response = await request(mockapp).post("/challenges/create").set('Authorization', `Bearer ${token}`).send({challenge_name: "Test challenge", user_id: 3, total_habits:11});
        expect(response.body.error.message).toBe("Total habits should be between 1 and 10")
    });

    it.skip("challenge should appear in database after creation", async () => {
        // Login user in the mock application 
        const loginResponse = await request(app).post("/auth/login").send({email:"charlie@hard75.com", password:"test1234"});
        const token1 = loginResponse.body.token;
        const returnedUser = await request(app).get("/users/profile")
           .set("Authorization", `Bearer ${token1}`);
        expect(returnedUser.body.user.id).toBeDefined();
        const userId = returnedUser.body.user.id;
        console.log("userId", userId)

        // Create test challenge 
        // const createdChallenge = await request(app).post("/challenges/create").set('Authorization', `Bearer ${token1}`).send({challenge_name: "Test Challenge", total_habits:4});
        const response = (await request(app).get("/challenges/list").set('Authorization', `Bearer ${token1}`));
        
        const testChallenge = response.body.data.find(
                challenge => 
                    challenge.challenge_name === "Test Challenge" && 
                    challenge.user_id === userId && 
                    challenge.status === "active"
                );
        console.log(testChallenge);
        expect(testChallenge).toBeDefined();
        expect(testChallenge).toMatchObject({ id: expect.any(Number),
                challenge_name: "Test Challenge",
                total_habits: 4,
                user_id: userId,
                status: "active"})
    })
    
    it("should return 409 if user has existing active challenge", async () => {
        mockPrisma.challenges.findFirst.mockResolvedValue({
            id: 1, challenge_name: "alice's challenge", total_habits: 4, status:"active", user_id:1
        });
        const challenge = {challenge_name: "Test challenge", total_habits:5};
        const response = await request(mockapp).post("/challenges/create").set('Authorization', `Bearer ${token}`).send(challenge);
        expect(response.body.error.message).toBe(`User with id 1 is already participating in a challenge`);
    });
   
    
    it("should throw error if totalHabits is non Numeric", async ()=>{
        mockPrisma.challenges.findFirst.mockResolvedValue(null);
        const response = await request(mockapp).post("/challenges/create").set('Authorization', `Bearer ${token}`).send({challenge_name: "Test challenge", user_id: 3, total_habits:"five"}); 
        expect(response.body.error.message).toBe("total Habits should be an integer");
        expect(response.status).toBe(400);

    });
    it("should throw error if challenge name is absent", async () => {
        mockPrisma.challenges.findFirst.mockResolvedValue(null);
        const response = await request(mockapp).post("/challenges/create").set('Authorization', `Bearer ${token}`).send({challenge_name: null, user_id: 3, total_habits:5}); 
        expect(response.body.error.message).toBe("Challenge Name and Total Habits are required");
        expect(response.status).toBe(400);
    });
    
    it("should handle db errors gracefullly", async () => {
        
        // Mock Prisma in Challenge routes
        mockPrisma.challenges.findFirst.mockResolvedValue(null);
        mockPrisma.challenges.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError(
                    'Connection lost',
                    { code: 'P1001', clientVersion: '5.0.0' }
        ));
       const response = await request(mockapp).post("/challenges/create").set('Authorization', `Bearer ${token}`).send({challenge_name: "Test challenge", user_id: 3, total_habits:5}); 
       expect(response.body.error.message).toBe("Database connection lost")
    })
})

