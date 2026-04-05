import { createAgentApp } from "@world-caas/agent-mini-app";

export default await createAgentApp({
  framework: "next",
  apiKey: process.env.CAAS_API_KEY!,
  walletAddress: process.env.AGENT_WALLET!,

  app: {
    name: "WeatherWorld",
    description:
      "Real-time weather data and forecasts powered by Open-Meteo API",
    icon: "https://em-content.zobj.net/source/apple/391/sun-behind-rain-cloud_1f326-fe0f.png",
    category: "Weather",
    url: process.env.AUTH_URL || "http://localhost:3000",
    developer: "WeatherWorld Team",
    version: "1.0.0",
  },

  skills: [
    {
      id: "current-weather",
      name: "Current Weather",
      description:
        "Get current weather conditions for any location by latitude and longitude",
      price: "0.001",
      route: "/api/weather/current",
      method: "GET",
    },
    {
      id: "weather-forecast",
      name: "Weather Forecast",
      description:
        "Get multi-day weather forecast for any location by latitude and longitude",
      price: "0.002",
      route: "/api/weather/forecast",
      method: "GET",
    },
  ],
});

export const config = {
  matcher: ["/_caas/:path*", "/api/:path*"],
};
