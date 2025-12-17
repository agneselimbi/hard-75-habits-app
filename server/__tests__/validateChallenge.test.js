import validateChallenge from "../src/utils/validateChallenge";

describe("validateChallenge test suite", () => {
  test("null challengeId should throw error", async () => {
    // Arrange
    const challengeId = null;
    //Act and Assert
    await expect(validateChallenge(challengeId)).rejects.toThrow(
      "ChallengeId is required",
    );
  });
  test("non existent challenge should throw error", async () => {
    //Arrange
    const challengeId = 999;
    const mockPrisma = {
      challenges: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    //Act and Assert
    await expect(validateChallenge(challengeId, mockPrisma)).rejects.toThrow(
      `Challenge with id ${challengeId} not found in Database`,
    );
  });
  test("should return none because challenge is present in database", async () => {
    //Arrange
    const challengeId = 2;
    const mockPrisma = {
      challenges: {
        findUnique: jest.fn().mockResolvedValue({
          challenge_id: 2,
          challenge_name: "No buy challenge",
          userId: 5,
          total_habits: 3,
          previous_challenge_id: null,
        }),
      },
    };
    //Act and Assert
    await expect(validateChallenge(challengeId, mockPrisma)).resolves.toEqual(
      undefined,
    );
    expect(mockPrisma.challenges.findUnique).toHaveBeenCalledWith({
      where: { id: 2 },
    });
  });
});
