import validateUser from "../src/utils/validateUser";

describe("Testing validateUser function", () => {
  //Test 1
  test("should throw error when userId is null", async () => {
    //Arrange
    const userId = null;
    //Act & Assert
    await expect(validateUser(userId)).rejects.toThrow("User ID is required");
  });
  test("should throw error when user does not exist", async () => {
    //Arrange
    const userId = 999;
    //Create a mock Prisma client
    const mockPrisma = {
      users: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    await expect(validateUser(userId, mockPrisma)).rejects.toThrow(
      `User with id ${userId} not found`,
    );
    expect(mockPrisma.users.findUnique).toHaveBeenCalledWith({
      where: { id: 999 },
    });
  });

  test("Should return None because user is present in db", async () => {
    const userId = 5;
    //Create a mock Prisma client
    const mockPrisma = {
      users: {
        findUnique: jest.fn().mockResolvedValue({
          userId: 5,
          name: "Alice",
          email: "alice@75hard.com",
        }),
      },
    };
    await expect(validateUser(userId, mockPrisma)).resolves.toEqual(undefined);
    expect(mockPrisma.users.findUnique).toHaveBeenCalledWith({
      where: { id: 5 },
    });
  });
});
