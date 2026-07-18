"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { AMENITY_OPTIONS } from "@/lib/amenitie";
import { PROPERTY_TYPE_OPTIONS } from "@/lib/PropertyTypes";
import { VIBE_OPTIONS } from "@/lib/Vibes";
import PriceRangeSlider from "@/components/PriceSlider";
import type { SearchFilters } from "@/lib/types";

export interface FilterDraft {
  property_type?: string;
  vibe?: string;
  min_price?: number;
  max_price?: number;
  amenities: string[];
}

interface Props {
  open: boolean;
  filters: SearchFilters;
  amenities: string[];
  onClose: () => void;
  onApply: (filters: SearchFilters, amenities: string[]) => void;
}

function buildDraft(filters: SearchFilters, amenities: string[]): FilterDraft {
  return {
    property_type: filters.property_type,
    vibe: filters.vibe,
    min_price: filters.min_price,
    max_price: filters.max_price,
    amenities: [...amenities],
  };
}

function PillRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[];
  value?: string;
  onChange: (next: string | undefined) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(({ value: optionValue, label, icon: OptionIcon }) => {
        const isActive = value === optionValue;
        return (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(isActive ? undefined : optionValue)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition ${
              isActive
                ? "border-sky-600 bg-sky-600 text-white"
                : "border-border bg-card hover:border-sky-400/60"
            }`}
          >
            <OptionIcon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function FiltersModal({
  open: isOpen,
  filters,
  amenities,
  onClose: handleClose,
  onApply: applyFilters,
}: Props) {
  const [filterDraft, setFilterDraft] = useState<FilterDraft>(() => buildDraft(filters, amenities));

  useEffect(() => {
    if (isOpen) setFilterDraft(buildDraft(filters, amenities));
  }, [isOpen, filters, amenities]);

  if (!isOpen) return null;

  const toggleAmenitySelection = (name: string) => {
    setFilterDraft((d) => ({
      ...d,
      amenities: d.amenities.includes(name)
        ? d.amenities.filter((a) => a !== name)
        : [...d.amenities, name],
    }));
  };

  const clearAllFilters = () => {
    setFilterDraft({ amenities: [] });
  };

  const submitFilters = () => {
    applyFilters(
      {
        ...filters,
        property_type: filterDraft.property_type,
        vibe: filterDraft.vibe,
        min_price: filterDraft.min_price,
        max_price: filterDraft.max_price,
        page: 1,
      },
      filterDraft.amenities
    );
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Filters</h2>
          <button type="button" onClick={handleClose} className="rounded-full p-2 hover:bg-muted" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
          <section>
            <h3 className="mb-4 text-base font-semibold">Type of place</h3>
            <PillRow
              options={PROPERTY_TYPE_OPTIONS}
              value={filterDraft.property_type}
              onChange={(property_type) => setFilterDraft((d) => ({ ...d, property_type }))}
            />
          </section>

          <section className="border-t border-border pt-8">
            <h3 className="mb-4 text-base font-semibold">Vibe</h3>
            <PillRow
              options={VIBE_OPTIONS}
              value={filterDraft.vibe}
              onChange={(vibe) => setFilterDraft((d) => ({ ...d, vibe }))}
            />
          </section>

          <section className="border-t border-border pt-8">
            <h3 className="mb-4 text-base font-semibold">Price range</h3>
            <p className="mb-4 text-sm text-muted-foreground">Nightly prices before fees and taxes</p>
            <PriceRangeSlider
              minValue={filterDraft.min_price}
              maxValue={filterDraft.max_price}
              onChange={(min_price, max_price) => setFilterDraft((d) => ({ ...d, min_price, max_price }))}
            />
          </section>

          <section className="border-t border-border pt-8">
            <h3 className="mb-4 text-base font-semibold">Amenities</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {AMENITY_OPTIONS.map((name) => (
                <label
                  key={name}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 hover:bg-sky-50 dark:hover:bg-sky-950/30"
                >
                  <input
                    type="checkbox"
                    checked={filterDraft.amenities.includes(name)}
                    onChange={() => toggleAmenitySelection(name)}
                    className="h-4 w-4 accent-sky-600"
                  />
                  <span className="text-sm">{name}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <button type="button" onClick={clearAllFilters} className="text-sm font-medium text-sky-600 underline">
            Clear all
          </button>
          <button
            type="button"
            onClick={submitFilters}
            className="rounded-xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white hover:bg-sky-700"
          >
            Show stays
          </button>
        </div>
      </div>
    </div>
  );
}

export function countActiveFilters(filters: SearchFilters, amenities: string[]) {
  let count = 0;
  if (filters.property_type) count++;
  if (filters.vibe) count++;
  if (filters.min_price != null) count++;
  if (filters.max_price != null) count++;
  count += amenities.length;
  return count;
}