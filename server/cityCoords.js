/** Approximate city centres (India) for Open-Meteo and hyper-local heuristics */

export const CITY_COORDS = {
  Delhi: { lat: 28.6139, lon: 77.209 },
  Gurugram: { lat: 28.4595, lon: 77.0266 },
  Noida: { lat: 28.5355, lon: 77.391 },
  Mumbai: { lat: 19.076, lon: 72.8777 },
  Bengaluru: { lat: 12.9716, lon: 77.5946 },
  Hyderabad: { lat: 17.385, lon: 78.4867 },
  Chennai: { lat: 13.0827, lon: 80.2707 },
  Kolkata: { lat: 22.5726, lon: 88.3639 },
  Pune: { lat: 18.5204, lon: 73.8567 },
  Jaipur: { lat: 26.9124, lon: 75.7873 },
  Ahmedabad: { lat: 23.0225, lon: 72.5714 },
  Lucknow: { lat: 26.8467, lon: 80.9462 },
};

/** Cities modelled as historically lower water-logging exposure for gig routes */
export const WATER_LOGGING_SAFE_CITIES = new Set([
  "Jaipur",
  "Pune",
  "Ahmedabad",
  "Hyderabad",
  "Bengaluru",
]);

/** Higher monsoon / urban flood sensitivity */
export const WATER_LOGGING_HIGH_RISK_CITIES = new Set(["Mumbai", "Kolkata", "Delhi", "Chennai"]);

export function resolveCoords(location) {
  return CITY_COORDS[location] ?? CITY_COORDS.Delhi;
}
