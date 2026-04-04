/**
 * GigShield dynamic pricing — interpretable linear model (logistic-regression style scores → ₹ adjustment).
 * Demonstrates ML-style hyper-local pricing: e.g. −₹2/week in water-logging-safe zones when other risks are calm.
 */

import {
  WATER_LOGGING_HIGH_RISK_CITIES,
  WATER_LOGGING_SAFE_CITIES,
} from "../cityCoords.js";

/**
 * @typedef {Object} SignalFeatures
 * @property {string} location
 * @property {number} rainProbabilityNext24h 0..1 (from forecast)
 * @property {number} aqiRisk 0..1 (normalized hazard)
 * @property {boolean} publicHolidayIndia
 * @property {boolean} mockTrafficDisruption
 */

/**
 * Mock "trained" weights (₹ impact per unit feature, clamped for stability).
 */
const W = {
  bias: 0,
  /** Hyper-local: safe from chronic water logging → −₹2/week as per product brief */
  waterLoggingSafe: -2,
  waterLoggingHighCityRain: 6,
  /** Scaled so calm + safe city nets to ~−₹2/week; spikes still push premium up */
  rainScale: 4,
  aqiScale: 3,
  holiday: 3,
  traffic: 5,
};

/**
 * @param {SignalFeatures} f
 * @returns {{ weeklyPremiumDeltaINR: number, extendedCoverageHours: number, featureVector: Record<string, number>, explanations: string[] }}
 */
export function predictDynamicPremium(f) {
  const safeZone = WATER_LOGGING_SAFE_CITIES.has(f.location);
  const highFloodCity = WATER_LOGGING_HIGH_RISK_CITIES.has(f.location);

  const rain = Math.max(0, Math.min(1, f.rainProbabilityNext24h));
  const aqi = Math.max(0, Math.min(1, f.aqiRisk));

  let delta = W.bias;
  const explanations = [];

  if (safeZone) {
    delta += W.waterLoggingSafe;
    explanations.push(
      "Hyper-local model: zone historically safer from chronic water logging → −₹2/week on weekly premium."
    );
  }

  if (highFloodCity && rain > 0.45) {
    delta += W.waterLoggingHighCityRain * rain;
    explanations.push(
      "Elevated pluvial / water-logging risk for this city × forecast rain → surcharge component applied."
    );
  }

  delta += Math.round(W.rainScale * rain);
  if (rain > 0.25) {
    explanations.push(`Precipitation signal (next 24h ~${Math.round(rain * 100)}%) → risk-weighted premium component.`);
  }

  delta += Math.round(W.aqiScale * aqi);
  if (aqi > 0.4) {
    explanations.push(`AQI / particulate hazard signal → +₹${Math.round(W.aqiScale * aqi)} (scaled).`);
  }

  if (f.publicHolidayIndia) {
    delta += W.holiday;
    explanations.push("Public holiday (India) → mild demand / routing disruption factor.");
  }

  if (f.mockTrafficDisruption) {
    delta += W.traffic;
    explanations.push("Civic / route disruption feed (mock API) → congestion loss factor.");
  }

  /** Extra insured hours when model expects severe weather soon */
  let extendedCoverageHours = 0;
  if (rain > 0.65) {
    extendedCoverageHours = 2;
    explanations.push("Predictive weather: extended coverage window +2h on active policy days (model output).");
  } else if (rain > 0.4) {
    extendedCoverageHours = 1;
    explanations.push("Predictive weather: extended coverage window +1h (model output).");
  }

  const weeklyPremiumDeltaINR = Math.round(Math.max(-25, Math.min(40, delta)));

  return {
    weeklyPremiumDeltaINR,
    extendedCoverageHours,
    featureVector: {
      rainProbabilityNext24h: rain,
      aqiRisk: aqi,
      waterLoggingSafe: safeZone ? 1 : 0,
      highFloodCity: highFloodCity ? 1 : 0,
      publicHolidayIndia: f.publicHolidayIndia ? 1 : 0,
      mockTrafficDisruption: f.mockTrafficDisruption ? 1 : 0,
    },
    explanations,
  };
}
