export default function validateRegistration(data) {
  const errors = [];
  const emailPattern = "^[a-zA-z0-9_%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$";
  const passwordPattern = "^(?=.*[0-9])(?=.*[a-zA-Z]).{6,}$";
  const namePattern = "^[a-zA-Z0-9 ]{1,50}$";

  if (!data.email || !data.email.match(emailPattern)) {
    errors.push("Invalid Email");
  }
  if (!data.password || !data.password.match(passwordPattern)) {
    errors.push(
      "Password must be at least 6 characters long and contain at least one number",
    );
  }
  if (!data.name || !data.name.match(namePattern)) {
    errors.push("Name should be between 1 and 50 characters.");
  }
  if (errors.length === 0) {
    return { valid: true };
  }
  return { valid: errors.length === 0, errors: errors };
}
