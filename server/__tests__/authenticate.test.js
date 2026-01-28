import { generateExpiredToken, generateTestToken } from "./helpers/index.js";
import { createMockUser } from "./helpers/index.js";
import { authenticateMiddleware } from "../src/middleware/authenticateMiddleware.js";

describe("Testing authenticate middleware", () => {
    it("Missing token should raise a 401 error", () => {
        const req = {headers :{authorization: ""}};
        const res = {status: jest.fn().mockReturnThis(), json: jest.fn()};
        const next = jest.fn();
        authenticateMiddleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: { message: "No token provided" } });
        expect(next).not.toHaveBeenCalled();
    });
    it("Expired token should raise a 401 error", () => {
        const user = createMockUser({id:3, name:"Charlie", email:"charlie@hard75.com"})
        const expiredToken = generateExpiredToken(user);
        const req = {headers:{authorization: "Bearer " + expiredToken}};
        console.log("Req.headers:", req.headers.authorization);
        const res = {status: jest.fn().mockReturnThis(), json: jest.fn()};
        const next = jest.fn();
        authenticateMiddleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({error: { message: "Expired token"} });
        expect(next).not.toHaveBeenCalled();
    });
    it("Token not starting with Bearer should raise an error", () => {
        const user = createMockUser({id:3, name:"Charlie", email:"charlie@hard75.com"})
        const InvalidToken = generateTestToken(user).split("")[1];//corrupt the token
        const req = {headers :{authorization:  InvalidToken}};
        const res = {status: jest.fn().mockReturnThis(), json:jest.fn()};
        const next = jest.fn();
        authenticateMiddleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: { message: "No token provided" } });
        expect(next).not.toHaveBeenCalled();
    });
    it("Invalid token should raise an error", () => {
        const user = createMockUser({id:3, name:"Charlie", email:"charlie@hard75.com"})
        const InvalidToken = generateTestToken(user) + "invalid"; //corrupt the token
        const req = {headers :{authorization: "Bearer " + InvalidToken}};
        const res = {status: jest.fn().mockReturnThis(), json: jest.fn()};
        const next = jest.fn();
        authenticateMiddleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: { message: "Invalid token" } });
        expect(next).not.toHaveBeenCalled();
    });
    it.skip("Valid token should grant access to resource", () => {
        const user = createMockUser({id:3, name:"Charlie", email:"charlie@hard75.com"})
        const token = generateTestToken(user);
        const req = {headers :{authorization: "Bearer " + token}};
        const res = {};
        const next = jest.fn();
        authenticateMiddleware(req, res, next);
        expect(next).toHaveBeenCalled();
    })
})