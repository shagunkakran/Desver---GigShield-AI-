/**
 * Loads sklearn-trained linear model from JSON (train_premium_model.py)
 * and prefers subprocess call to Python predict_premium.py when available.
 */

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  WATER_LOGGING_HIGH_RISK_CITIES,
  WATER_LOGGING_SAFE_CITIES,
} from "../cityCoords.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL_JSON = path.join(__dirname, "sklearn_premium.json");
const PREDICT_PY = path.join(__dirname, "..", "..", "ml_python", "predict_premium.py");

function buildVector(location, f) {
  const safeZone = WATER_LOGGING_SAFE_CITIES.has(location) ? 1 : 0;
  const highFlood = WATER_LOGGING_HIGH_RISK_CITIES.has(location) ? 1 : 0;
  return {
    rainProbabilityNext24h: Math.max(0, Math.min(1, Number(f.rainProbabilityNext24h) || 0)),
    aqiRisk: Math.max(0, Math.min(1, Number(f.aqiRisk) || 0)),
    waterLoggingSafe: safeZone,
    highFloodCity: highFlood,
    publicHolidayIndia: f.publicHolidayIndia ? 1 : 0,
    mockTrafficDisruption: f.mockTrafficDisruption ? 1 : 0,
  };
}

function predictFromJsonFile(featureVector) {
  if (!fs.existsSync(MODEL_JSON)) return null;
  const model = JSON.parse(fs.readFileSync(MODEL_JSON, "utf8"));
  const names = model.feature_names;
  const x = names.map((n) => Number(featureVector[n] ?? 0));
  let raw = model.intercept ?? 0;
  for (let i = 0; i < names.length; i++) {
    raw += (model.coefficients[i] ?? 0) * x[i];
  }
  const weeklyPremiumDeltaINR = Math.round(Math.max(-25, Math.min(40, raw)));
  return { weeklyPremiumDeltaINR, rawScore: raw, featureVector };
}

/**
 * @param {object} opts location + signal features
 * @returns {Promise<{ used: boolean, weeklyPremiumDeltaINR: number, featureVector: object, explanations: string[], note?: string }>}
 */
export async function predictPremiumSklearn(opts) {
  const featureVector = buildVector(opts.location, opts);
  const explanations = [];

  const skipPython = process.env.SKLEARN_PYTHON === "0";
  if (!skipPython && fs.existsSync(PREDICT_PY)) {
    const py = process.env.PYTHON ?? "python";
    const r = spawnSync(py, [PREDICT_PY], {
      input: JSON.stringify({ location: opts.location, features: featureVector }),
      encoding: "utf-8",
      maxBuffer: 2 * 1024 * 1024,
      timeout: 15000,
      windowsHide: true,
    });
    if (r.status === 0 && r.stdout?.trim()) {
      try {
        const out = JSON.parse(r.stdout.trim());
        if (typeof out.weeklyPremiumDeltaINR === "number") {
          explanations.push("Premium delta from sklearn LinearRegression (Python subprocess).");
          return {
            used: true,
            weeklyPremiumDeltaINR: out.weeklyPremiumDeltaINR,
            featureVector: out.featureVector ?? featureVector,
            explanations,
            note: null,
          };
        }
      } catch {
        /* fall through */
      }
    }
  }

  const fromFile = predictFromJsonFile(featureVector);
  if (fromFile) {
    explanations.push("Premium delta from sklearn coefficients (JSON dot-product in Node).");
    return {
      used: true,
      weeklyPremiumDeltaINR: fromFile.weeklyPremiumDeltaINR,
      featureVector: fromFile.featureVector,
      explanations,
      note: skipPython ? "PYTHON disabled; used sklearn JSON in Node" : null,
    };
  }

  return {
    used: false,
    weeklyPremiumDeltaINR: 0,
    featureVector,
    explanations: [],
    note: "sklearn_premium.json missing — run ml_python/train_premium_model.py",
  };
}
