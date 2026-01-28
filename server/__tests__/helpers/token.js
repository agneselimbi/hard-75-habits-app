import jwt from "jsonwebtoken";
import config from "../../src/config/config.js";

// Generate test token
export function generateTestToken(payload, expiresIn = "1h") {
  return jwt.sign(payload, config.jwt.secret, { expiresIn });
}

// Generate expired token
export function generateExpiredToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: "-10s" });
}
describe("Testing generateTestToken and generateExpiredToken", () => {
  it("generateTestToken should create a valid token", () => {
    const payload = { id: 1, name: "testuser", email:"test@example.com"};
    const token = generateTestToken(payload, "1h");
    const decoded = jwt.verify(token, config.jwt.secret);
    expect(decoded.id).toBe(payload.id);
    expect(decoded.name).toBe(payload.name);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.passwordHash).toBe(payload.passwordHash);
  });
  it("generateExpiredToken should create an expired token", () => {
    const payload = { id: 1, username: "testuser" };
    const token = generateExpiredToken(payload);
    try {
      jwt.verify(token, config.jwt.secret);
    } catch (error) {
      expect(error.name).toBe("TokenExpiredError");
    }
  });
});