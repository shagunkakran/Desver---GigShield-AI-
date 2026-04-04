import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { connectMongo, isMongoConnected } from "./db.js";
import apiRouter from "./routes/api.js";
import { startTriggerCron } from "./services/cronTriggers.js";

const PORT = Number(process.env.PORT ?? 5050);
const MONGODB_URI = process.env.MONGODB_URI ?? "";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, "..", "dist");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.use("/api", apiRouter);

// In production on Render, serve the built React app from the same service.
if (process.env.NODE_ENV === "production") {
  app.use(express.static(DIST_DIR));

  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
}

async function main() {
  if (!MONGODB_URI.trim()) {
    console.error("[GigShield API] FATAL: MONGODB_URI is required. Set it in .env (see .env.example).");
    process.exit(1);
  }

  try {
    await connectMongo(MONGODB_URI);
  } catch (e) {
    console.error("[GigShield API] FATAL: MongoDB connection failed:", e.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[GigShield API] listening on http://localhost:${PORT}  mongo=${isMongoConnected()}`);
    startTriggerCron();
  });
}

main();
