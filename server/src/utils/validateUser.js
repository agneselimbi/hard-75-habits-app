async function validateUser(userEmail, prisma) {
  if (!userEmail) {
    throw new Error("User email is required");
  }
  //Check if user exists in the database
  const user = await prisma.users.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    throw new Error(`User with email ${userEmail} not found`);
  }
}
export default validateUser;
