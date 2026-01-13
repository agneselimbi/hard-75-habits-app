import validateChallenge from "../src/utils/validateChallenge";
import {
  createMockPrismaClient,
  createMockUser,
  createMockChallenge,
} from "./helpers/index.js";

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
    const fakeChallenge = createMockChallenge({ id: challengeId });
    const mockPrisma = createMockPrismaClient();
    mockPrisma.challenges.findUnique.mockResolvedValue(fakeChallenge);
    //Act and Assert
    await expect(validateChallenge(challengeId, mockPrisma)).resolves.toEqual(
      undefined,
    );
    expect(mockPrisma.challenges.findUnique).toHaveBeenCalledWith({
      where: { id: challengeId },
    });
  });
});
