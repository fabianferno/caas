"use client";

import { getWeatherEmoji, getWeatherInfo } from "@/lib/weather";

interface CurrentWeatherData {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    pressure_msl: number;
  };
  current_units: Record<string, string>;
}

export function CurrentWeather({
  data,
  city,
}: {
  data: CurrentWeatherData | null;
  city: string;
}) {
  if (!data) {
    return (
      <div className="bg-surface rounded-2xl p-6 border border-border animate-pulse">
        <div className="h-32 bg-surface-light rounded-xl" />
      </div>
    );
  }

  const weather = getWeatherInfo(data.current.weather_code);
  const emoji = getWeatherEmoji(weather.icon);

  return (
    <div className="bg-surface rounded-2xl p-6 border border-border">
      {/* City + Status */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{city}</h2>
          <p className="text-sm text-accent-dim">{weather.label}</p>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-accent pulse-glow inline-block" />
          <span className="text-xs text-accent-dim font-mono">LIVE</span>
        </div>
      </div>

      {/* Main temp */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-6xl">{emoji}</span>
        <div>
          <p className="text-5xl font-bold text-accent font-mono">
            {Math.round(data.current.temperature_2m)}
            <span className="text-2xl text-accent-dim">
              {data.current_units.temperature_2m}
            </span>
          </p>
          <p className="text-sm text-foreground/60 mt-1">
            Feels like {Math.round(data.current.apparent_temperature)}
            {data.current_units.apparent_temperature}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Humidity"
          value={`${data.current.relative_humidity_2m}%`}
        />
        <StatCard
          label="Wind"
          value={`${Math.round(data.current.wind_speed_10m)} km/h`}
        />
        <StatCard
          label="Pressure"
          value={`${Math.round(data.current.pressure_msl)} hPa`}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-light rounded-xl p-3 text-center border border-border">
      <p className="text-xs text-foreground/50 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm font-bold text-accent font-mono mt-1">{value}</p>
    </div>
  );
}
