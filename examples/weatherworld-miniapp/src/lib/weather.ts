// WMO Weather interpretation codes
// https://open-meteo.com/en/docs#weathervariables
export function getWeatherInfo(code: number): {
  label: string;
  icon: string;
} {
  const map: Record<number, { label: string; icon: string }> = {
    0: { label: "Clear sky", icon: "sun" },
    1: { label: "Mainly clear", icon: "sun" },
    2: { label: "Partly cloudy", icon: "cloud-sun" },
    3: { label: "Overcast", icon: "cloud" },
    45: { label: "Fog", icon: "fog" },
    48: { label: "Rime fog", icon: "fog" },
    51: { label: "Light drizzle", icon: "drizzle" },
    53: { label: "Moderate drizzle", icon: "drizzle" },
    55: { label: "Dense drizzle", icon: "drizzle" },
    61: { label: "Slight rain", icon: "rain" },
    63: { label: "Moderate rain", icon: "rain" },
    65: { label: "Heavy rain", icon: "rain" },
    66: { label: "Freezing rain", icon: "rain" },
    67: { label: "Heavy freezing rain", icon: "rain" },
    71: { label: "Slight snow", icon: "snow" },
    73: { label: "Moderate snow", icon: "snow" },
    75: { label: "Heavy snow", icon: "snow" },
    77: { label: "Snow grains", icon: "snow" },
    80: { label: "Slight showers", icon: "rain" },
    81: { label: "Moderate showers", icon: "rain" },
    82: { label: "Violent showers", icon: "rain" },
    85: { label: "Slight snow showers", icon: "snow" },
    86: { label: "Heavy snow showers", icon: "snow" },
    95: { label: "Thunderstorm", icon: "thunder" },
    96: { label: "Thunderstorm + hail", icon: "thunder" },
    99: { label: "Thunderstorm + heavy hail", icon: "thunder" },
  };
  return map[code] || { label: "Unknown", icon: "cloud" };
}

export function getWeatherEmoji(iconType: string): string {
  const emojiMap: Record<string, string> = {
    sun: "\u2600",
    "cloud-sun": "\u26C5",
    cloud: "\u2601",
    fog: "\uD83C\uDF2B",
    drizzle: "\uD83C\uDF26",
    rain: "\uD83C\uDF27",
    snow: "\u2744",
    thunder: "\u26A1",
  };
  return emojiMap[iconType] || "\u2601";
}

// Common cities with coordinates
export const CITIES = [
  { name: "New York", lat: 40.7128, lon: -74.006 },
  { name: "London", lat: 51.5074, lon: -0.1278 },
  { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
  { name: "Sydney", lat: -33.8688, lon: 151.2093 },
  { name: "Dubai", lat: 25.2048, lon: 55.2708 },
  { name: "Paris", lat: 48.8566, lon: 2.3522 },
  { name: "Mumbai", lat: 19.076, lon: 72.8777 },
  { name: "Sao Paulo", lat: -23.5505, lon: -46.6333 },
  { name: "Lagos", lat: 6.5244, lon: 3.3792 },
  { name: "Singapore", lat: 1.3521, lon: 103.8198 },
];
