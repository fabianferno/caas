"use client";

import { CITIES } from "@/lib/weather";

interface CityPickerProps {
  selected: string;
  onSelect: (city: { name: string; lat: number; lon: number }) => void;
}

export function CityPicker({ selected, onSelect }: CityPickerProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {CITIES.map((city) => (
        <button
          key={city.name}
          onClick={() => onSelect(city)}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
            selected === city.name
              ? "bg-accent text-black border-accent"
              : "bg-surface-light text-foreground/70 border-border hover:border-accent/50"
          }`}
        >
          {city.name}
        </button>
      ))}
    </div>
  );
}
