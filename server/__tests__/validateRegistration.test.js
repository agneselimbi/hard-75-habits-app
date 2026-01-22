import validateRegistration from "../src/utils/validationRegistration.js";
import { createMockUser } from "./helpers/testData.js";

describe.only("Testing validateRegistration function", () => {
  test("validateRegistration should reject incorrect email format", async () => {
    const userWithInvalidEmail = await createMockUser({
      email: "invalidEmail.com",
    });
    expect(validateRegistration(userWithInvalidEmail)).toEqual({
      valid: false,
      errors: ["Invalid Email"],
    });
  });
  test("validateRegistration should reject Passwords with length < 6", async () => {
    const userWithInvalidPassword = await createMockUser({ password: "Pass1" });
    expect(validateRegistration(userWithInvalidPassword)).toEqual({
      valid: false,
      errors: [
        "Password must be at least 6 characters long and contain at least one number",
      ],
    });
  });
  it("validateRegistrationshould reject Passwords without numbers", async () => {
    const userWithInvalidPassword = createMockUser({ password: "Password" });
    expect(validateRegistration(userWithInvalidPassword)).toEqual({
      valid: false,
      errors: [
        "Password must be at least 6 characters long and contain at least one number",
      ],
    });
  });
  it("validateRegistrationshould reject empty passwords", async () => {
    const userWithInvalidPassword = await createMockUser({ password: "" });
    expect(validateRegistration(userWithInvalidPassword)).toEqual({
      valid: false,
      errors: [
        "Password must be at least 6 characters long and contain at least one number",
      ],
    });
  });
  it("validateRegistrationshould reject empty Names", async () => {
    const userWithEmptyName = createMockUser({ name: "" });
    expect(validateRegistration(userWithEmptyName)).toEqual({
      valid: false,
      errors: ["Name should be between 1 and 50 characters."],
    });
  });
  it("validateRegistrationshould reject Names with length>50", async () => {
    const userWithLongName = await createMockUser({
      name: "abcdefghijklmopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
    });
    expect(validateRegistration(userWithLongName)).toEqual({
      valid: false,
      errors: ["Name should be between 1 and 50 characters."],
    });
  });
  it("validateRegistrationshould return all the errors", async () => {
    const userWithMultipleErrors = createMockUser({
      name: "abcdefghijklmopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      password: "",
      email: "invalidEmail.com",
    });
    expect(validateRegistration(userWithMultipleErrors)).toMatchObject({
      valid: false,
      errors: [
        "Invalid Email",
        "Password must be at least 6 characters long and contain at least one number",
        "Name should be between 1 and 50 characters.",
      ],
    });
  });
  it("validateRegistrationshould return object with valid true", async () => {
    const validUser = createMockUser();
    expect(validateRegistration(validUser)).toEqual({
      valid: true,
    });
  });
});
