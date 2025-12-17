async function validateUser(userId, prisma) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  //Check if user exists in the database
  const user = await prisma.users.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error(`User with id ${userId} not found`);
  }
}
export default validateUser;
