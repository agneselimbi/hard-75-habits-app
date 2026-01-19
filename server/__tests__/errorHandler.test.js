import request from "supertest";
import app from "../src/app.js";

describe("Error Handlers", () => {
  test("Not Found Handler", async () => {
    const response = await request(app)
      .get("/notfound")
      .expect(404) // Assert status
      .expect("Content-Type", /json/); // Assert content-type
  });
  test("Unauthorized Error Handler", async () => {
    const response = await request(app)
      .get("/test")
      .expect(401) // Assert status
      .expect("Content-Type", /json/); // Assert content-type
  });
});
