import mongoose from "mongoose";

let connected = false;

export async function connectMongo(uri) {
  if (!uri?.trim()) {
    throw new Error("MONGODB_URI is required");
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  connected = true;
  return true;
}

export function isMongoConnected() {
  return connected && mongoose.connection.readyState === 1;
}
