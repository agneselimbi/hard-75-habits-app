// Mock database helper

export function createMockPrismaClient() {
  return {
    users: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    challenges: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    challenge_habits: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
    },
    daily_checkins: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe.skip("Mock Prisma Client", () => {
  test("should mock findUnique method", async () => {
    const mockPrisma = createMockPrismaClient();
    const mockUser = { id: 1, name: "Test User", email: "<EMAIL>" };
    mockPrisma.users.findUnique.mockResolvedValue(mockUser);
    const result = await mockPrisma.users.findUnique({ where: { id: 1 } });
    expect(result).toEqual(mockUser);
  });
});
