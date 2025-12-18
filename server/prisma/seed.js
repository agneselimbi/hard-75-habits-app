import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  
    //   Create sample user data
  const alice = await prisma.users.upsert({
    where: { email: "alice@hard75.com" },
    update: {},
    create: {
      email: "alice@hard75.com",
      name: "Alice",
      password: "test1234",
    },
  });
  const bob = await prisma.users.upsert({
    where: { email: "bob@hard75.com" },
    update: {},
    create: {
      email: "bob@hard75.com",
      name: "Bob",
      password: "test1234",
    },
  });
  const charlie = await prisma.users.upsert({
    where: { email: "charlie@hard75.com" },
    update: {},
    create: {
      email: "charlie@hard75.com",
      name: "Charlie",
      password: "test1234",
    },
  });
  console.log({ alice, bob, charlie });
}

try {
  await main();
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
