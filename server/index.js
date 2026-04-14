import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
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
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(cors({ origin: true }));
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
app.use(express.json());

const RATE_WINDOW_MS = Number(process.env.API_RATE_WINDOW_MS ?? 60_000);
const RATE_MAX_REQUESTS = Number(process.env.API_RATE_MAX_REQUESTS ?? 300);
const ipBuckets = new Map();

app.use((req, res, next) => {
  const now = Date.now();
  const ip = String(req.ip ?? req.headers["x-forwarded-for"] ?? "unknown");
  if (ipBuckets.size > 10_000) {
    for (const [key, value] of ipBuckets.entries()) {
      if (now - value.startAt >= RATE_WINDOW_MS) ipBuckets.delete(key);
    }
  }
  const bucket = ipBuckets.get(ip);
  if (!bucket || now - bucket.startAt >= RATE_WINDOW_MS) {
    ipBuckets.set(ip, { startAt: now, count: 1 });
    return next();
  }
  bucket.count += 1;
  if (bucket.count > RATE_MAX_REQUESTS) {
    return res.status(429).json({ error: "rate limit exceeded. please retry shortly." });
  }
  return next();
});

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
    console.error("[Desver API] FATAL: MONGODB_URI is required. Set it in .env (see .env.example).");
    process.exit(1);
  }

  try {
    await connectMongo(MONGODB_URI);
  } catch (e) {
    console.error("[Desver API] FATAL: MongoDB connection failed:", e.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[Desver API] listening on http://localhost:${PORT}  mongo=${isMongoConnected()}`);
    startTriggerCron();
  });
}

main();
