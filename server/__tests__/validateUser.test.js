import validateUser from "../src/utils/validateUser";
import { createMockPrismaClient, createMockUser } from "./helpers/index.js";

describe("Testing validateUser function", () => {
  //Test 1
  test("should throw error when userId is null", async () => {
    //Arrange
    const userEmail = null;
    //Act & Assert
    await expect(validateUser(userEmail)).rejects.toThrow("User email is required");
  });
  test("should throw error when user does not exist", async () => {
    //Arrange
    const userEmail = 'testuser@example.com';
    //Create a mock Prisma client
    const mockPrisma = {
      users: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    await expect(validateUser(userEmail, mockPrisma)).rejects.toThrow(
      `User with email ${userEmail} not found`,
    );
    expect(mockPrisma.users.findUnique).toHaveBeenCalledWith({
      where: { email: 'testuser@example.com' },
    });
  });

  test("Should return None because user is present in db", async () => {
    const userEmail = 'testuser@example.com';
    const fakeUser = createMockUser({ eamil:userEmail });
    //Create a mock Prisma client
    const mockPrisma = createMockPrismaClient();
    mockPrisma.users.findUnique.mockResolvedValue(fakeUser);
    await expect(validateUser(userEmail, mockPrisma)).resolves.toEqual(undefined);
    expect(mockPrisma.users.findUnique).toHaveBeenCalledWith({
      where: { email: 'testuser@example.com' },
    });
  });
});
