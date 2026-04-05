"use client";

import { getWeatherEmoji, getWeatherInfo } from "@/lib/weather";

interface ForecastData {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
  };
}

export function Forecast({ data }: { data: ForecastData | null }) {
  if (!data) {
    return (
      <div className="bg-surface rounded-2xl p-6 border border-border animate-pulse">
        <div className="h-48 bg-surface-light rounded-xl" />
      </div>
    );
  }

  const days = data.daily.time.map((date, i) => ({
    date,
    maxTemp: Math.round(data.daily.temperature_2m_max[i]),
    minTemp: Math.round(data.daily.temperature_2m_min[i]),
    code: data.daily.weather_code[i],
    rain: data.daily.precipitation_sum[i],
    wind: Math.round(data.daily.wind_speed_10m_max[i]),
  }));

  return (
    <div className="bg-surface rounded-2xl p-6 border border-border">
      <h3 className="text-sm font-bold text-accent uppercase tracking-wider mb-4">
        7-Day Forecast
      </h3>
      <div className="space-y-2">
        {days.map((day) => {
          const weather = getWeatherInfo(day.code);
          const emoji = getWeatherEmoji(weather.icon);
          const dayName = new Date(day.date).toLocaleDateString("en-US", {
            weekday: "short",
          });

          return (
            <div
              key={day.date}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <span className="text-sm text-foreground/70 w-10 font-mono">
                {dayName}
              </span>
              <span className="text-lg w-8 text-center">{emoji}</span>
              <span className="text-xs text-foreground/50 w-24 text-center truncate">
                {weather.label}
              </span>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-sm font-bold text-accent">
                  {day.maxTemp}
                </span>
                <span className="text-xs text-foreground/40">/</span>
                <span className="text-sm text-foreground/50">
                  {day.minTemp}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
