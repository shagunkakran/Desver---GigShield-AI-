import fs from "fs";
import path from "path";

const root = process.cwd();
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");

if (fs.existsSync(envPath)) {
  console.log("[setup] .env already exists, skipping.");
  process.exit(0);
}

if (!fs.existsSync(examplePath)) {
  console.error("[setup] .env.example not found.");
  process.exit(1);
}

fs.copyFileSync(examplePath, envPath);
console.log("[setup] Created .env from .env.example");
console.log("[setup] Update MONGODB_URI in .env before starting backend.");
