import bcrypt from "bcrypt";

export async function hashPassword(password) {
  if (!password || password.length == 0) {
    throw new Error("Password required.");
  }
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
}

export async function verifyPassword(plainPassword, hashedPassword) {
  if (!plainPassword || !hashedPassword) {
    throw new Error("Unable to verify Password due to missing inputs");
  }
  const  isMatch = await bcrypt.compare(plainPassword, hashedPassword);
  return  isMatch;
}
