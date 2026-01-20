import { hashPassword, verifyPassword } from "../src/utils/password";

describe("Testing password utilities", () => {
  test("hashPassword should throw error if password is undefined", async () => {
    const password = null;
    await expect(hashPassword(password)).rejects.toThrow("Password required.");
  });
  test("hashPassword should throw error if password empty", async () => {
    const password = "";
    await expect(hashPassword(password)).rejects.toThrow("Password required.");
  });
  test("hashPassword should return a hashed password", async () => {
    const password = "password123";
    const hashedPassword = await hashPassword(password);
    expect(hashedPassword).not.toBe(password);
  });
  test("hashPassword should return a different hashed password each time", async () => {
    const password = "password123";
    const hashedPassword1 = await hashPassword(password);
    const hashedPassword2 = await hashPassword(password);
    expect(hashedPassword1).not.toEqual(hashedPassword2);
  });
  test("verifyPassword should return true for correct password", async () => {
    const password = "password123";
    await expect(
      verifyPassword(password, await hashPassword(password)),
    ).resolves.toEqual(undefined);
  });
  test("verifyPassword should throw error for incorrect correct password", async () => {
    await expect(
      verifyPassword("password1234", await hashPassword("password123")),
    ).rejects.toThrow("Incorrect password provided");
  });
  test("verifyPassword should throw error for missing inputs", async () => {
    await expect(
      verifyPassword(await hashPassword("password123")),
    ).rejects.toThrow("Unable to verify Password due to missing inputs");
  });
});
