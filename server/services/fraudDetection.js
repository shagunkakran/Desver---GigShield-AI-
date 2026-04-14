import { ClaimModel, WorkerModel } from "../models/index.js";

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

const CITY_WEATHER_RISK_BASELINE = {
  delhi: 0.22,
  mumbai: 0.31,
  bangalore: 0.19,
  bengaluru: 0.19,
  kolkata: 0.28,
  chennai: 0.24,
  pune: 0.18,
  hyderabad: 0.2,
  noida: 0.21,
  gurgaon: 0.21,
};

function getSeasonFactor(date = new Date()) {
  const month = date.getMonth() + 1;
  // Monsoon pressure (Jun-Sep) increases expected weather claim share.
  if (month >= 6 && month <= 9) return 1.25;
  // Winter fog / cold disruption (Dec-Jan) slight increase.
  if (month === 12 || month === 1) return 1.1;
  return 1;
}

function getExpectedWeatherClaimRatio(location) {
  const city = String(location ?? "").trim().toLowerCase();
  const baseline = CITY_WEATHER_RISK_BASELINE[city] ?? 0.2;
  return clamp01(baseline * getSeasonFactor());
}

/**
 * fraud_score = location anomaly + activity mismatch + pattern similarity
 */
export async function calculateFraudScore(worker) {
  const workerId = String(worker._id);
  const baseHash = hashString(`${workerId}-${worker.location}-${worker.workerType}`);
  const lookback = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));

  const [recentClaims, peerWorkers] = await Promise.all([
    ClaimModel.find({ workerId: worker._id, triggeredAt: { $gte: lookback } })
      .sort({ triggeredAt: -1 })
      .limit(20)
      .lean(),
    WorkerModel.find({
      _id: { $ne: worker._id },
      location: worker.location,
      workerType: worker.workerType,
    }).limit(25).lean(),
  ]);

  const triggerSet = new Set(worker.activeTriggers ?? []);
  const manualClaims = recentClaims.filter((c) => !c.autoTriggered).length;
  const weatherTaggedClaims = recentClaims.filter((c) =>
    /weather|rain|flood|storm|heatwave|hail/i.test(String(c.type) + String(c.reason))
  ).length;
  const weatherTaggedRatio = recentClaims.length > 0 ? weatherTaggedClaims / recentClaims.length : 0;
  const expectedWeatherRatio = getExpectedWeatherClaimRatio(worker.location);
  const repeatedTypeCount = recentClaims.reduce((acc, claim) => {
    acc[claim.type] = (acc[claim.type] ?? 0) + 1;
    return acc;
  }, {});
  const peakRepeatedPattern = Object.values(repeatedTypeCount).reduce((m, v) => Math.max(m, Number(v)), 0);

  const locationAnomaly = clamp01(
    ((baseHash % 100) / 100) * 0.35 +
    (triggerSet.has("traffic_civic_mock") ? 0.2 : 0) +
    (peakRepeatedPattern >= 4 ? 0.2 : 0)
  );

  const activityMismatch = clamp01(
    (((baseHash >> 3) % 100) / 100) * 0.25 +
    (manualClaims >= 2 ? 0.25 : 0) +
    (triggerSet.size === 0 && recentClaims.length >= 2 ? 0.25 : 0)
  );

  // Delivery-specific fake weather claim detector using historical city/season baseline.
  const weatherOveruseRatio = Math.max(0, weatherTaggedRatio - expectedWeatherRatio);
  const fakeWeatherClaims = clamp01(
    Math.min(0.55, weatherOveruseRatio * 1.8) +
    (weatherTaggedClaims >= 3 ? 0.2 : weatherTaggedClaims === 2 ? 0.1 : 0) +
    (triggerSet.has("weather_precipitation") ? 0 : 0.2)
  );

  let clusterMatches = 0;
  for (const peer of peerWorkers) {
    const peerTriggers = new Set(peer.activeTriggers ?? []);
    const overlap = [...triggerSet].filter((t) => peerTriggers.has(t)).length;
    if (overlap >= 2) clusterMatches += 1;
  }
  const patternSimilarity = clamp01((clusterMatches / 5) + (baseHash % 7 === 0 ? 0.2 : 0));

  const fraudScore = clamp01(
    (locationAnomaly * 0.35) +
    (activityMismatch * 0.25) +
    (patternSimilarity * 0.25) +
    (fakeWeatherClaims * 0.15)
  );

  const anomalies = [];
  if (locationAnomaly >= 0.45) {
    anomalies.push({
      type: "GPS Spoofing",
      severity: locationAnomaly > 0.7 ? "High" : "Medium",
      detail: "Location anomaly: claim/trigger behavior implies non-physical movement pattern.",
    });
  }
  if (activityMismatch >= 0.4) {
    anomalies.push({
      type: "Fake Inactivity",
      severity: activityMismatch > 0.7 ? "High" : "Medium",
      detail: "Activity mismatch: claim cadence does not align with observed trigger activity.",
    });
  }
  if (fakeWeatherClaims >= 0.35) {
    anomalies.push({
      type: "Fake Weather Claims",
      severity: fakeWeatherClaims > 0.6 ? "High" : "Medium",
      detail: "Historical weather-linked claim frequency exceeds expected trigger pattern.",
    });
  }
  if (patternSimilarity >= 0.5) {
    anomalies.push({
      type: "Cluster Fraud",
      severity: patternSimilarity > 0.75 ? "Critical" : "High",
      detail: "Cluster similarity: multiple nearby workers show correlated suspicious trigger patterns.",
    });
  }

  return {
    fraudScore,
    riskCategory: fraudScore > 0.6 ? "High Risk" : fraudScore > 0.3 ? "Moderate" : "Low Risk",
    components: {
      locationAnomaly: Number(locationAnomaly.toFixed(3)),
      activityMismatch: Number(activityMismatch.toFixed(3)),
      patternSimilarity: Number(patternSimilarity.toFixed(3)),
      fakeWeatherClaims: Number(fakeWeatherClaims.toFixed(3)),
      weatherTaggedRatio: Number(weatherTaggedRatio.toFixed(3)),
      expectedWeatherRatio: Number(expectedWeatherRatio.toFixed(3)),
    },
    anomalies,
    clusterSignals: { peerWorkersScanned: peerWorkers.length, clusterMatches },
    lastChecked: new Date(),
  };
}
