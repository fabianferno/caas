import { NextRequest, NextResponse } from "next/server";

// Open-Meteo API - free, no API key needed
// Docs: https://open-meteo.com/en/docs

interface WeatherResponse {
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat") || "40.7128"; // default NYC
  const lon = searchParams.get("lon") || "-74.006";

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl&temperature_unit=celsius&wind_speed_unit=kmh`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch weather data" },
        { status: 502 }
      );
    }

    const data: WeatherResponse = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Weather service unavailable" },
      { status: 503 }
    );
  }
}
