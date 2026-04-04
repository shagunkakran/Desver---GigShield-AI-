import { resolveCoords } from "../cityCoords.js";

const USER_AGENT = "GigShield-Phase2/1.0 (demo; +https://localhost)";

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  if (!text?.trim()) throw new Error("empty response body");
  return JSON.parse(text);
}

/**
 * Open-Meteo forecast — public, no API key.
 * @param {number} lat
 * @param {number} lon
 */
export async function fetchWeatherForecast(lat, lon) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("hourly", "precipitation_probability,precipitation");
  url.searchParams.set("forecast_days", "2");
  url.searchParams.set("timezone", "Asia/Kolkata");

  const data = await fetchJson(url.toString());
  const probs = data.hourly?.precipitation_probability ?? [];
  const next24 = probs.slice(0, 24);
  const maxP = next24.length ? Math.max(...next24) / 100 : 0;
  const meanP = next24.length
    ? next24.reduce((a, b) => a + b, 0) / next24.length / 100
    : 0;

  return {
    rainProbabilityNext24h: Math.max(maxP, meanP * 0.85),
    raw: { maxPrecipProbabilityPct: next24.length ? Math.max(...next24) : null },
  };
}

/**
 * Open-Meteo Air Quality API — public.
 */
export async function fetchAirQuality(lat, lon) {
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("hourly", "pm10,pm2_5");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("timezone", "Asia/Kolkata");

  const data = await fetchJson(url.toString());
  const pm25 = data.hourly?.pm2_5 ?? [];
  const latest = pm25.length ? pm25[0] : 30;

  /** Map PM2.5 µg/m³ to 0..1 hazard (rough WHO bands) */
  const aqiRisk = Math.min(1, Math.max(0, (latest - 12) / 120));

  return { pm25Latest: latest, aqiRisk };
}

/**
 * Nager.Date — public holidays for India (IN).
 */
export async function fetchIndiaPublicHolidayToday() {
  const y = new Date().getFullYear();
  const url = `https://date.nager.at/api/v3/PublicHolidays/${y}/IN`;
  const list = await fetchJson(url);
  const iso = new Date().toISOString().slice(0, 10);
  const hit = Array.isArray(list) ? list.find((h) => h.date === iso) : null;
  return {
    publicHolidayIndia: Boolean(hit),
    holidayName: hit?.name ?? null,
  };
}

/**
 * Mock civic / traffic disruption API (replaceable with real news/traffic provider).
 */
export async function fetchMockTrafficDisruption(location) {
  /** Deterministic pseudo-random from city name so demo is stable per session city */
  let h = 0;
  for (let i = 0; i < location.length; i++) h = (h * 31 + location.charCodeAt(i)) >>> 0;
  const active = h % 5 === 0;
  return {
    mockTrafficDisruption: active,
    detail: active
      ? "Mock feed: VIP movement / corridor restriction reported in metro core (simulated)."
      : "Mock feed: no major corridor disruption flagged.",
  };
}

/**
 * Aggregate five automated triggers + raw signal payload for UI.
 */
export async function evaluateAllSignals(location) {
  const { lat, lon } = resolveCoords(location);

  const results = await Promise.allSettled([
    fetchWeatherForecast(lat, lon),
    fetchAirQuality(lat, lon),
    fetchIndiaPublicHolidayToday(),
    fetchMockTrafficDisruption(location),
  ]);

  const weather = results[0].status === "fulfilled" ? results[0].value : { rainProbabilityNext24h: 0.2, error: String(results[0].reason) };
  const aq = results[1].status === "fulfilled" ? results[1].value : { pm25Latest: 40, aqiRisk: 0.25, error: String(results[1].reason) };
  const hol = results[2].status === "fulfilled" ? results[2].value : { publicHolidayIndia: false, error: String(results[2].reason) };
  const traf = results[3].status === "fulfilled" ? results[3].value : { mockTrafficDisruption: false, error: String(results[3].reason) };

  const rainP = weather.rainProbabilityNext24h ?? 0;
  const aqiRisk = aq.aqiRisk ?? 0;

  const triggers = [
    {
      id: "weather_precipitation",
      name: "Weather — precipitation forecast",
      active: rainP >= 0.35,
      severity: Math.round(rainP * 100) / 100,
      source: "api.open-meteo.com (forecast)",
      detail:
        rainP >= 0.35
          ? `Next 24h rain probability elevated (~${Math.round(rainP * 100)}%) — income-loss risk for outdoor gigs.`
          : `Rain probability moderate (~${Math.round(rainP * 100)}%).`,
    },
    {
      id: "air_quality",
      name: "Air quality — PM2.5 hazard",
      active: aqiRisk >= 0.45,
      severity: aqiRisk,
      source: "air-quality-api.open-meteo.com",
      detail:
        aqiRisk >= 0.45
          ? `PM2.5-derived hazard high (latest ~${aq.pm25Latest} µg/m³). Pollution disruption trigger eligible.`
          : `PM2.5 levels relatively controlled (latest ~${aq.pm25Latest} µg/m³).`,
    },
    {
      id: "public_holiday",
      name: "Calendar — India public holiday",
      active: hol.publicHolidayIndia,
      severity: hol.publicHolidayIndia ? 1 : 0,
      source: "date.nager.at (IN holidays)",
      detail: hol.publicHolidayIndia
        ? `Today is a public holiday${hol.holidayName ? `: ${hol.holidayName}` : ""} — demand pattern shift.`
        : "No public holiday today (India).",
    },
    {
      id: "water_logging_hyperlocal",
      name: "Hyper-local — water logging exposure",
      active: rainP >= 0.4 && ["Mumbai", "Kolkata", "Delhi", "Chennai"].includes(location),
      severity: rainP,
      source: "GigShield heuristics + forecast",
      detail:
        rainP >= 0.4 && ["Mumbai", "Kolkata", "Delhi", "Chennai"].includes(location)
          ? `${location}: elevated monsoon / urban flood correlation with forecast rain.`
          : `${location}: water-logging risk within normal band for current forecast.`,
    },
    {
      id: "traffic_civic_mock",
      name: "Traffic / civic disruption (mock API)",
      active: Boolean(traf.mockTrafficDisruption),
      severity: traf.mockTrafficDisruption ? 0.75 : 0.1,
      source: "mock-civic-feed (replaceable)",
      detail: traf.detail,
    },
  ];

  return {
    location,
    lat,
    lon,
    triggers,
    features: {
      rainProbabilityNext24h: rainP,
      aqiRisk,
      publicHolidayIndia: Boolean(hol.publicHolidayIndia),
      mockTrafficDisruption: Boolean(traf.mockTrafficDisruption),
    },
    errors: {
      weather: results[0].status === "rejected" ? String(results[0].reason) : null,
      airQuality: results[1].status === "rejected" ? String(results[1].reason) : null,
      holidays: results[2].status === "rejected" ? String(results[2].reason) : null,
      traffic: results[3].status === "rejected" ? String(results[3].reason) : null,
    },
  };
}
