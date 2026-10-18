import "dotenv/config"

if (!process.env.MONGODB_URL) {
  throw new Error("Missing required environment variable: MONGODB_URL");
}

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGODB_URL: process.env.MONGODB_URL,
  JWT_SECRET:process.env.JWT_SECRET,
  JWT_EXPIRES_IN:process.env.JWT_EXPIRES_IN
};