"use client";

import { CITIES } from "@/lib/weather";
import { useCallback, useEffect, useState } from "react";
import { CityPicker } from "./CityPicker";
import { CurrentWeather } from "./CurrentWeather";
import { Forecast } from "./Forecast";

export function WeatherDashboard() {
  const [city, setCity] = useState(CITIES[0]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [current, setCurrent] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchWeather = useCallback(
    async (lat: number, lon: number) => {
      setLoading(true);
      try {
        const [currentRes, forecastRes] = await Promise.all([
          fetch(`/api/weather/current?lat=${lat}&lon=${lon}`),
          fetch(`/api/weather/forecast?lat=${lat}&lon=${lon}`),
        ]);
        const [currentData, forecastData] = await Promise.all([
          currentRes.json(),
          forecastRes.json(),
        ]);
        setCurrent(currentData);
        setForecast(forecastData);
      } catch (err) {
        console.error("Failed to fetch weather:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchWeather(city.lat, city.lon);
  }, [city, fetchWeather]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-accent">WeatherWorld</h1>
          <p className="text-xs text-foreground/50 font-mono">
            Powered by Open-Meteo + CaaS
          </p>
        </div>
        <div className="bg-surface-light border border-accent/30 rounded-lg px-3 py-1.5">
          <span className="text-xs font-mono text-accent">AGENT READY</span>
        </div>
      </div>

      {/* City picker */}
      <CityPicker
        selected={city.name}
        onSelect={(c) => setCity(c)}
      />

      {/* Current weather */}
      {loading ? (
        <div className="bg-surface rounded-2xl p-6 border border-border animate-pulse">
          <div className="h-32 bg-surface-light rounded-xl" />
        </div>
      ) : (
        <CurrentWeather data={current} city={city.name} />
      )}

      {/* Forecast */}
      {loading ? (
        <div className="bg-surface rounded-2xl p-6 border border-border animate-pulse">
          <div className="h-48 bg-surface-light rounded-xl" />
        </div>
      ) : (
        <Forecast data={forecast} />
      )}

      {/* Agent skills info */}
      <div className="bg-surface rounded-2xl p-4 border border-accent/20">
        <h3 className="text-xs font-bold text-accent uppercase tracking-wider mb-3">
          Agent Skills
        </h3>
        <div className="space-y-2">
          <SkillBadge
            name="Current Weather"
            route="GET /api/weather/current"
            price="0.001 WLD"
          />
          <SkillBadge
            name="Weather Forecast"
            route="GET /api/weather/forecast"
            price="0.002 WLD"
          />
        </div>
      </div>
    </div>
  );
}

function SkillBadge({
  name,
  route,
  price,
}: {
  name: string;
  route: string;
  price: string;
}) {
  return (
    <div className="flex items-center justify-between bg-surface-light rounded-lg px-3 py-2 border border-border">
      <div>
        <p className="text-sm font-medium text-foreground">{name}</p>
        <p className="text-xs font-mono text-foreground/40">{route}</p>
      </div>
      <span className="text-xs font-mono text-accent bg-accent/10 px-2 py-1 rounded">
        {price}
      </span>
    </div>
  );
}
