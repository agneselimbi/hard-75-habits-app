async function validateChallenge(challengeId, prisma) {
  if (!challengeId) {
    throw new Error("ChallengeId is required");
  }
  const challenge = await prisma.challenges.findUnique({
    where: { id: challengeId },
  });
  if (!challenge) {
    throw new Error(`Challenge with id ${challengeId} not found in Database`);
  }
}
export default validateChallenge;
