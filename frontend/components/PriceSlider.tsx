"use client";

import { clampPrice, formatPrice, PRICE_MAX, PRICE_MIN, PRICE_STEP } from "@/lib/PriceRange";

interface Props {
  minValue?: number;
  maxValue?: number;
  onChange: (min: number | undefined, max: number | undefined) => void;
}

export default function PriceRangeSlider({ minValue, maxValue, onChange }: Props) {
  const currentMin = minValue ?? PRICE_MIN;
  const currentMax = maxValue ?? PRICE_MAX;
  const minPercent = ((currentMin - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;
  const maxPercent = ((currentMax - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;

  const handleMinChange = (rawValue: number) => {
    const clampedValue = clampPrice(Math.min(rawValue, currentMax - PRICE_STEP));
    onChange(clampedValue <= PRICE_MIN ? undefined : clampedValue, maxValue);
  };

  const handleMaxChange = (rawValue: number) => {
    const clampedValue = clampPrice(Math.max(rawValue, currentMin + PRICE_STEP));
    onChange(minValue, clampedValue >= PRICE_MAX ? undefined : clampedValue);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm">
        <div className="rounded-xl border border-border px-4 py-3">
          <span className="block text-xs text-muted-foreground">Minimum</span>
          <span className="font-semibold">{formatPrice(currentMin)}</span>
        </div>
        <span className="text-muted-foreground">—</span>
        <div className="rounded-xl border border-border px-4 py-3">
          <span className="block text-xs text-muted-foreground">Maximum</span>
          <span className="font-semibold">{formatPrice(currentMax)}+</span>
        </div>
      </div>

      <div className="relative h-8 px-1">
        <div className="absolute left-1 right-1 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-sky-600"
          style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
        />
        <input
          type="range"
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={PRICE_STEP}
          value={currentMin}
          onChange={(e) => handleMinChange(Number(e.target.value))}
          className="range-thumb pointer-events-none absolute inset-x-0 top-0 h-8 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto"
          aria-label="Minimum price"
        />
        <input
          type="range"
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={PRICE_STEP}
          value={currentMax}
          onChange={(e) => handleMaxChange(Number(e.target.value))}
          className="range-thumb pointer-events-none absolute inset-x-0 top-0 h-8 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto"
          aria-label="Maximum price"
        />
      </div>
    </div>
  );
}