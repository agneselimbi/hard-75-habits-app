export function createMockUser(overrides = {}) {
  /** Creates a mock user object with random name and email
   * @returns {object} Mock user object
   */
  const sampleUserName = ["Alice", "Bob", "Charlie", "Diana"];
  const randomIndex = Math.floor(Math.random() * sampleUserName.length);
  const randomName = sampleUserName[randomIndex];
  const randomEmail =
    sampleUserName[randomIndex] +
    Math.floor(Math.random() * 100) +
    "@hard75.com";
  const ramd = Math.floor(Math.random() * 100);
  return {
    id: ramd,
    name: randomName,
    email: randomEmail,
    password: "password123",
    ...overrides,
  };
}

export function createMockChallenge(overrides = {}) {
  /** Creates a mock challenge object
   * @returns {object} Mock challenge object
   */

  const sampleChallengeNames = [
    "alice's challenge",
    "bob's challenge",
    "charlie's challenge",
    "diana's challenge",
  ];

  const randomIndex = Math.floor(Math.random() * sampleChallengeNames.length);
  return {
    id: Math.floor(Math.random() * 1000),
    challenge_name: sampleChallengeNames[randomIndex],
    user_id: Math.floor(Math.random() * 100),
    total_habits: Math.floor(Math.random() * 1000),
    current_day: 10,
    status: "active",
    previous_challenge_id: null,
    ...overrides,
  };
}

export function createMockHabit(overrides = {}) {
  /** Creates a mock habit object
   * @returns {object} Mock habit object
   */
  const habitNames = [
    "do 10 pushups",
    "read 20 pages",
    "meditate for 10 minutes",
    "drink 2L of water",
    "workout for 1 hour",
    "write in a journal",
    "no junk food",
    "no social media",
    "cold shower  for 5 minutes",
    "walk for 30 minutes",
    "read a book",
    "learn spanish for 15 minutes",
    "practice coding for 30 minutes",
  ];
  const numberHabits = Math.floor(Math.random() * habitNames.length);
  const habits = [];
  for (let i = 0; i < numberHabits; i++) {
    const habit = {
      id: Math.floor(Math.random() * 1000),
      habit_name: habitNames[i],
      challenge_id: Math.floor(Math.random() * 1000),
      habit_order: i + 1,
      ...overrides,
    };
    habits.push(habit);
  }
  return habits;
}

export function createMockDailyCheckin(overrides = {}) {
  /** Creates a mock daily checkin object
   * @returns {object} Mock daily checkin object
   */
  return {
    id: Math.floor(Math.random() * 1000),
    habit_id: Math.floor(Math.random() * 1000),
    checkin_date: new Date(),
    is_completed: Math.random() > 0.5,
    ...overrides,
  };
}

describe("testData helper functions", () => {
  test("createMockUser creates a user with default properties", () => {
    const user = createMockUser();
    expect(user).toHaveProperty("id");
    expect(user).toHaveProperty("name");
    expect(user).toHaveProperty("email");
  });

  test("createMockUser allows overriding default properties", () => {
    const customName = "Test User";
    const user = createMockUser({ name: customName });
    expect(user.name).toBe(customName);
  });

  test("generates unique emails", () => {
    const user1 = createMockUser();
    const user2 = createMockUser();
    expect(user1.email).not.toBe(user2.email);
  });

  test;

  test("createMockChallenge creates a challenge with default properties", () => {
    const challenge = createMockChallenge();
    expect(challenge).toHaveProperty("id");
    expect(challenge).toHaveProperty("challenge_name");
    expect(challenge).toHaveProperty("user_id");
    expect(challenge).toHaveProperty("total_habits");
    expect(challenge).toHaveProperty("current_day");
    expect(challenge).toHaveProperty("status");
    expect(challenge).toHaveProperty("previous_challenge_id");
  });

  test("createMockChallenge allows overriding default properties", () => {
    const customName = "Custom Challenge";
    const challenge = createMockChallenge({
      challenge_name: customName,
      current_day: 15,
      status: "failed",
    });
    expect(challenge.challenge_name).toBe(customName);
    expect(challenge.current_day).toBe(15);
    expect(challenge.status).toBe("failed");
  });

  test("createMockHabit creates an array of habits", () => {
    const habits = createMockHabit();
    expect(Array.isArray(habits)).toBe(true);
  });

  test("createMockHabit creates habits with default properties", () => {
    const habits = createMockHabit();
    if (habits.length > 0) {
      const habit = habits[0];
      expect(habit).toHaveProperty("id");
      expect(habit).toHaveProperty("habit_name");
      expect(habit).toHaveProperty("challenge_id");
      expect(habit).toHaveProperty("habit_order");
    }
  });
  test("createMockDailyCheckin creates a daily checkin with default properties", () => {
    const checkin = createMockDailyCheckin();
    expect(checkin).toHaveProperty("id");
    expect(checkin).toHaveProperty("habit_id");
    expect(checkin).toHaveProperty("checkin_date");
    expect(checkin).toHaveProperty("is_completed");
  });
  test("createMockDailyCheckin allows overriding default properties", () => {
    const customHabitId = 123;
    const checkin = createMockDailyCheckin({ habit_id: customHabitId });
    expect(checkin.habit_id).toBe(customHabitId);
  });
});
