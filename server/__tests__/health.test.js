import request from "supertest";
import app from "../src/app.js";

describe("Health CheckPoint", () => {
  test("should return json", async () => {
    const response = await request(app)
      .get("/health")
      .expect(200) // Assert status
      .expect("Content-Type", /json/); // Assert content-type
  });
  test("should have timestamp in msg", async () => {
    const response = await request(app).get("/health");
    expect(response.body.timestamp).toBeDefined();
  });
});
