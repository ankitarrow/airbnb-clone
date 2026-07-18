"use client";

import dynamic from "next/dynamic";
import { X } from "lucide-react";
import type { ListingCard } from "@/lib/types";

const SearchResultsMap = dynamic(() => import("@/components/Map/SearchResultsMap"), {
  ssr: false,
  loading: () => <div className="h-full animate-pulse bg-muted" />,
});

interface Props {
  open: boolean;
  listings: ListingCard[];
  selectedId?: number | null;
  onSelect?: (id: number | null) => void;
  onClose: () => void;
}

export default function MapModal({ open: isOpen, listings, selectedId, onSelect, onClose: handleClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Map</h2>
          <span className="rounded-full bg-fuchsia-600/10 px-2.5 py-0.5 text-xs font-semibold text-fuchsia-600">
            {listings.length} {listings.length === 1 ? "stay" : "stays"}
          </span>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Close map"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="relative flex-1">
        <SearchResultsMap
          listings={listings}
          selectedId={selectedId}
          onSelect={onSelect}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}