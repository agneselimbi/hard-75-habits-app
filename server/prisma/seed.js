import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password.js";
const prisma = new PrismaClient();

function subtractDaysFromDate(dateInput, days) {
  const date = new Date(dateInput);
  date.setDate(date.getDate() - days);
  return date;
}

async function main() {
  // Delete existing data
  await prisma.daily_checkins.deleteMany({});
  await prisma.challenge_habits.deleteMany({});
  await prisma.challenges.deleteMany({});
  await prisma.users.deleteMany({});

  // Create sample user data
  const alice = await prisma.users.upsert({
    where: { email: "alice@hard75.com" },
    update: {},
    create: {
      email: "alice@hard75.com",
      name: "Alice",
      password: await hashPassword("test1234"),
    },
  });
  const bob = await prisma.users.upsert({
    where: { email: "bob@hard75.com" },
    update: {},
    create: {
      email: "bob@hard75.com",
      name: "Bob",
      password: await hashPassword("test1234"),
    },
  });
  const charlie = await prisma.users.upsert({
    where: { email: "charlie@hard75.com" },
    update: {},
    create: {
      email: "charlie@hard75.com",
      name: "Charlie",
      password: await hashPassword("test1234"),
    },
  });
  //Create sample challenges
  const challenge0 = await prisma.challenges.upsert({
    where: { id: 5 },
    update: {},
    create: {
      challenge_name: "alice's challenge",
      // user_id: alice.id,
      total_habits: 5,
      current_day: 15,
      status: "failed",
      created_at: new Date("2024-12-08"),
      start_date: new Date("2024-12-09"),
      challenge_owner: {
        connect: { id: alice.id }, // Explicitly connect
      },
    },
  });
  const challenge1 = await prisma.challenges.upsert({
    where: { id: 6 },
    update: {},
    create: {
      challenge_name: "alice's challenge",
      // user_id: alice.id,
      total_habits: 5,
      // previous_challenge_id: challenge0.id,
      current_day: 10,
      status: "active",
      created_at: subtractDaysFromDate(new Date(), 1),
      start_date: new Date(),
      challenge_owner: {
        connect: { id: alice.id }, // Explicitly connect
      },
      previous_challenges: {
        connect: { id: challenge0.id }, // Explicitly connect
      },
    },
  });
  const challenge2 = await prisma.challenges.upsert({
    where: { id: 7 },
    update: {},
    create: {
      challenge_name: "bob's challenge",
      // user_id: bob.id,
      total_habits: 3,
      current_day: 5,
      status: "active",
      created_at: subtractDaysFromDate(new Date(), 1),
      start_date: new Date(),
      challenge_owner: {
        connect: { id: bob.id }, // Explicitly connect
      },
    },
  });
  const challenge3 = await prisma.challenges.upsert({
    where: { id: 8 },
    update: {},
    create: {
      challenge_name: "charlie's challenge",
      // user_id: charlie.id,
      total_habits: 7,
      current_day: 75,
      status: "completed",
      completed_at: new Date("2025-10-04"),
      created_at: new Date("2025-07-21"),
      start_date: new Date("2025-07-21"),
      challenge_owner: {
        connect: { id: charlie.id }, // Explicitly connect
      },
    },
  });
  // Create sample challenge habits

  const alice_habit = await prisma.challenge_habits.createMany({
    data: [
      {
        habit_name: "do 10 pushups",
        challenge_id: challenge1.id,
        habit_order: 1,
        created_at: new Date("2025-12-08"),
      },
      {
        habit_name: "walk for 30 minutes",
        challenge_id: challenge1.id,
        habit_order: 2,
        created_at: new Date("2025-12-08"),
      },
      {
        habit_name: "workout for 1 hour",
        challenge_id: challenge1.id,
        habit_order: 3,
        created_at: new Date("2025-12-08"),
      },
      {
        habit_name: "no junk food",
        challenge_id: challenge1.id,
        habit_order: 4,
        created_at: new Date("2025-12-08"),
      },
      {
        habit_name: "write in a journal",
        challenge_id: challenge1.id,
        habit_order: 5,
        created_at: new Date("2025-12-08"),
      },
    ],
  });
  const bob_habit = await prisma.challenge_habits.createMany({
    data: [
      {
        habit_name: "meditate for 10 minutes",
        challenge_id: challenge2.id,
        habit_order: 1,
        created_at: new Date("2025-12-13"),
      },
      {
        habit_name: "no social media",
        challenge_id: challenge2.id,
        habit_order: 2,
        created_at: new Date("2025-12-13"),
      },
      {
        habit_name: "cold shower  for 5 minutes",
        challenge_id: challenge2.id,
        habit_order: 3,
        created_at: new Date("2025-12-13"),
      },
    ],
  });
  const charlie_habit = await prisma.challenge_habits.createMany({
    data: [
      {
        habit_name: "read a book",
        challenge_id: challenge3.id,
        habit_order: 1,
        created_at: new Date("2025-07-21"),
      },
      {
        habit_name: "do 10 pushups",
        challenge_id: challenge3.id,
        habit_order: 2,
        created_at: new Date("2025-07-21"),
      },
      {
        habit_name: "walk for 30 minutes",
        challenge_id: challenge3.id,
        habit_order: 3,
        created_at: new Date("2025-07-21"),
      },
      {
        habit_name: "workout for 1 hour",
        challenge_id: challenge3.id,
        habit_order: 4,
        created_at: new Date("2025-07-21"),
      },
      {
        habit_name: "no junk food",
        challenge_id: challenge3.id,
        habit_order: 5,
        created_at: new Date("2025-07-21"),
      },
      {
        habit_name: "write in a journal",
        challenge_id: challenge3.id,
        habit_order: 6,
        created_at: new Date("2025-07-21"),
      },
      {
        habit_name: "no social media",
        challenge_id: challenge3.id,
        habit_order: 7,
        created_at: new Date("2025-07-21"),
      },
    ],
  });

  // Create sample daily checkins

  //Alice's completed habits array

  const alice_completed_habits = await prisma.challenge_habits.findMany({
    where: { challenge_id: challenge1.id },
    select: { id: true, habit_order: true },
  });

  // Alice's daily checkin data
  for (let i = 10; i > 3; i--) {
    await prisma.daily_checkins.create({
      data: {
        user_id: alice.id,
        challenge_id: challenge1.id,
        day_number: i,
        checkin_date: subtractDaysFromDate(challenge1.start_date, 10 - i),
        completed_habit_ids:
          i == 10
            ? alice_completed_habits
                .filter((habit) => [2, 3, 5].includes(habit.habit_order))
                .map((habit) => habit.id)
            : alice_completed_habits.map((habit) => habit.id),
        all_habits_completed: i == 10 ? false : true,
        created_at: subtractDaysFromDate(challenge1.start_date, 10 - i),
      },
    });
  }

  const bob_completed_habits = await prisma.challenge_habits.findMany({
    where: { challenge_id: challenge2.id },
    select: { id: true, habit_order: true },
  });

  // Bob's daily checkin data
  for (let i = 5; i > 1; i--) {
    await prisma.daily_checkins.create({
      data: {
        user_id: bob.id,
        challenge_id: challenge2.id,
        checkin_date: subtractDaysFromDate(challenge2.start_date, 5 - i),
        day_number: i,
        completed_habit_ids:
          i == 5
            ? bob_completed_habits
                .filter((habit) => [1, 3].includes(habit.habit_order))
                .map((habit) => habit.id)
            : bob_completed_habits.map((habit) => habit.id),
        all_habits_completed: i == 5 ? false : true,
        created_at: subtractDaysFromDate(challenge2.start_date, 5 - i),
      },
    });
  }
  const charlie_completed_habits = await prisma.challenge_habits.findMany({
    select: { id: true, habit_order: true },
    where: { challenge_id: challenge3.id },
  });
  //Charlie's daily checkin
  for (let i = 75; i >= 74; i--) {
    await prisma.daily_checkins.create({
      data: {
        user_id: charlie.id,
        challenge_id: challenge3.id,
        checkin_date: subtractDaysFromDate(challenge3.start_date, 75 - i),
        day_number: i,
        completed_habit_ids: charlie_completed_habits.map((habit) => habit.id),
        all_habits_completed: true,
        created_at: subtractDaysFromDate(challenge3.start_date, 75 - i),
      },
    });
  }
}

try {
  await main();
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
