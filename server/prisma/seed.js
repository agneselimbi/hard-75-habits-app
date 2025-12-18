import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create sample user data
  // const alice = await prisma.users.upsert({
  //   where: { email: "alice@hard75.com" },
  //   update: {},
  //   create: {
  //     email: "alice@hard75.com",
  //     name: "Alice",
  //     password: "test1234",
  //   },
  // });
  // const bob = await prisma.users.upsert({
  //   where: { email: "bob@hard75.com" },
  //   update: {},
  //   create: {
  //     email: "bob@hard75.com",
  //     name: "Bob",
  //     password: "test1234",
  //   },
  // });
  // const charlie = await prisma.users.upsert({
  //   where: { email: "charlie@hard75.com" },
  //   update: {},
  //   create: {
  //     email: "charlie@hard75.com",
  //     name: "Charlie",
  //     password: "test1234",
  //   },
  // });

  //Create sample challenges
  // const challenge0 = await prisma.challenges.create({
  //   data: {
  //     challenge_name: "alice's challenge",
  //     // user_id: alice.id,
  //     total_habits: 5,
  //     current_day: 15,
  //     status: "failed",
  //     created_at: new Date("2024-12-08"),
  //     start_date: new Date("2024-12-09"),
  //     challenge_owner: {
  //       connect: { id: alice.id }, // Explicitly connect
  //     },
  //   },
  // });

  // const challenge1 = await prisma.challenges.create({
  //   data: {
  //     challenge_name: "alice's challenge",
  //     // user_id: alice.id,
  //     total_habits: 5,
  //     // previous_challenge_id: challenge0.id,
  //     current_day: 10,
  //     status: "active",
  //     created_at: new Date("2025-12-08"),
  //     start_date: new Date("2026-03-09"),
  //     challenge_owner: {
  //       connect: { id: alice.id }, // Explicitly connect
  //     },
  //     previous_challenges: {
  //       connect: { id: challenge0.id }, // Explicitly connect
  //     },
  //   },
  // });

  // const challenge2 = await prisma.challenges.create({
  //   data: {
  //     challenge_name: "bob's challenge",
  //     // user_id: bob.id,
  //     total_habits: 3,
  //     current_day: 5,
  //     status: "active",
  //     created_at: new Date("2025-12-13"),
  //     start_date: new Date("2025-12-14"),
  //     challenge_owner: {
  //       connect: { id: bob.id }, // Explicitly connect
  //     },
  //   },
  // });

  // const challenge3 = await prisma.challenges.create({
  //   data: {
  //     challenge_name: "charlie's challenge",
  //     // user_id: charlie.id,
  //     total_habits: 7,
  //     current_day: 75,
  //     status: "completed",
  //     completed_at: new Date("2025-10-04"),
  //     created_at: new Date("2025-07-21"),
  //     start_date: new Date("2025-07-21"),
  //     challenge_owner: {
  //       connect: { id: charlie.id }, // Explicitly connect
  //     },
  //   },
  // });


}
try {
  await main();
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
