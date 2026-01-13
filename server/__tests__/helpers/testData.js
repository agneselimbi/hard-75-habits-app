export function createMockUser(overrides = {}) {
  /** Creates a mock user object with random name and email
   * @returns {object} Mock user object
   */
  const sampleUserName = ["Alice", "Bob", "Charlie", "Diana"];
  const sampleUserEmail = [
    "alice@75hard.com",
    "bob@75hard.com",
    "charlie@75hard.com",
    "diana@75hard.com",
  ];
  const randomIndex = Math.floor(Math.random() * sampleUserName.length);
  const randomName = sampleUserName[randomIndex];
  const randomEmail = sampleUserEmail[randomIndex];
  const ramd = Math.floor(Math.random() * 100);
  return { id: ramd, name: randomName, email: randomEmail, ...overrides };
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

test.skip("placeholder", () => {});