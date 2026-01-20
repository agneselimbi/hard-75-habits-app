import dotenv from "dotenv";
dotenv.config();

function validateRequired() {
  const required = ["DATABASE_URL", "JWT_SECRET"];
  const missing = [];
  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. Please check your .env file or environment configuration. }`,
    );
  }
}

validateRequired();


const config = {
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 3000,
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    costFactor: parseInt(process.env.JWT_COST_FACTOR) || 10,
  },
};

export default config;
