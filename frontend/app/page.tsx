"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { List, Map, SlidersHorizontal } from "lucide-react";
import ListingCard from "@/components/Landing/Card";
import SearchBar from "@/components/Landing/SearchBar";
import FiltersModal, { countActiveFilters } from "@/components/Landing/Filters";
import MapModal from "@/components/Map/MapModal";
import { api } from "@/lib/apis";
import type { ListingCard as ListingCardType, SearchFilters } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { VIBE_OPTIONS } from "@/lib/Vibes";

const SearchResultsMap = dynamic(() => import("@/components/Map/SearchResultsMap"), {
  ssr: false,
  loading: () => <div className="h-full animate-pulse rounded-xl bg-muted" />,
});

export default function HomePage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<SearchFilters>({ page: 1 });
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [listings, setListings] = useState<ListingCardType[]>([]);
  const [mapListings, setMapListings] = useState<ListingCardType[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const sentinelRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const buildFilters = useCallback(
    (f: SearchFilters, p: number, amenities: string[]) => {
      const guestCount = (f.adults || 0) + (f.children || 0);
      return {
        ...f,
        page: p,
        guests: guestCount > 0 ? guestCount : undefined,
        amenities: amenities.length > 0 ? amenities.join(",") : undefined,
      };
    },
    []
  );

  const fetchPage = useCallback(
    async (f: SearchFilters, p: number, amenities: string[], append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const data = await api.getListings(buildFilters(f, p, amenities));
        setListings((prev) => (append ? [...prev, ...data.items] : data.items));
        setHasMore(data.page < data.total_pages);
        setPage(data.page);
        setFetchError(false);
      } catch {
        if (!append) {
          setListings([]);
          setFetchError(true);
        }
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildFilters]
  );

  const fetchMapListings = useCallback(
    async (f: SearchFilters, amenities: string[]) => {
      try {
        const data = await api.getListings({
          ...buildFilters(f, 1, amenities),
          page_size: 100,
        });
        setMapListings(data.items);
      } catch {
        setMapListings([]);
      }
    },
    [buildFilters]
  );

  const resetAndFetch = useCallback(
    (f: SearchFilters, amenities: string[]) => {
      setPage(1);
      setHasMore(true);
      if (f.q?.trim()) setShowMap(true);
      fetchPage(f, 1, amenities, false);
      fetchMapListings(f, amenities);
    },
    [fetchPage, fetchMapListings]
  );

  useEffect(() => {
    resetAndFetch(filters, selectedAmenities);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      api.getFavorites().then((favs) => setFavoriteIds(new Set(favs.map((f) => f.id)))).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (showMap || mapOpen) {
      fetchMapListings(filters, selectedAmenities);
    }
  }, [showMap, mapOpen, filters, selectedAmenities, fetchMapListings]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchPage(filters, page + 1, selectedAmenities, true);
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, filters, selectedAmenities, fetchPage]);

  useEffect(() => {
    if (highlightedId && cardRefs.current[highlightedId]) {
      cardRefs.current[highlightedId]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [highlightedId]);

  const activeFilterCount = countActiveFilters(filters, selectedAmenities);
  const mappableCount = mapListings.filter((l) => l.lat != null && l.lng != null).length;

  const listingGrid = (
    <>
      {listings.map((listing) => (
        <div
          key={listing.id}
          ref={(el) => {
            cardRefs.current[listing.id] = el;
          }}
        >
          <ListingCard
            listing={listing}
            isFavorite={favoriteIds.has(listing.id)}
            isHighlighted={highlightedId === listing.id}
            onHover={setHighlightedId}
            onFavoriteToggle={() =>
              api.getFavorites().then((favs) => setFavoriteIds(new Set(favs.map((f) => f.id))))
            }
          />
        </div>
      ))}
    </>
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border/60 bg-background/95 px-4 py-5 sm:px-6 md:px-10 md:py-8">
        <div className="mx-auto max-w-[1760px]">
          <SearchBar
            filters={filters}
            onChange={setFilters}
            onSearch={() => resetAndFetch({ ...filters, page: 1 }, selectedAmenities)}
          />
        </div>
      </div>

      {/* Category (Vibe) Selector Bar */}
      <div className="sticky top-[72px] z-10 border-b border-border/40 bg-background/95 backdrop-blur-md px-4 py-3 sm:px-6 md:px-10">
        <div className="mx-auto flex max-w-[1760px] items-center justify-between gap-6">
          {/* Scrollable Categories List */}
          <div className="flex flex-1 items-center gap-8 overflow-x-auto scrollbar-hide scroll-smooth">
            {VIBE_OPTIONS.map((option) => {
              const VibeIcon = option.icon;
              const isActive = filters.vibe === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    const nextVibe = isActive ? undefined : option.value;
                    const nextFilters = { ...filters, vibe: nextVibe, page: 1 };
                    setFilters(nextFilters);
                    resetAndFetch(nextFilters, selectedAmenities);
                  }}
                  className={`flex flex-col items-center gap-1.5 border-b-2 pb-2 text-center transition-all hover:text-foreground/100 min-w-[56px] ${
                    isActive
                      ? "border-foreground text-foreground font-semibold"
                      : "border-transparent text-muted-foreground hover:border-muted-foreground/30 font-medium"
                  }`}
                >
                  <VibeIcon className={`h-6 w-6 transition ${isActive ? "scale-105" : "opacity-80"}`} />
                  <span className="text-[11px] tracking-wide whitespace-nowrap">
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Vertical Divider */}
          <div className="hidden h-8 w-px bg-border/60 sm:block" />

          {/* Filters Button */}
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className={`shadow-sm flex shrink-0 items-center gap-2 rounded-xl border border-border px-4 py-3 text-xs font-semibold transition hover:border-foreground hover:bg-muted/30 ${
              activeFilterCount > 0
                ? "border-foreground bg-foreground text-background"
                : "bg-card text-foreground"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-background/20 px-1.5 text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[1760px] px-4 py-8 sm:px-6 md:px-10">

        {loading ? (
          <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 md:gap-x-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-[20/19] animate-pulse rounded-xl bg-muted shadow-card" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : fetchError ? (
          <div className="py-24 text-center">
            <p className="text-muted-foreground">
              Could not load listings. The backend may be waking up (Render free tier takes ~30–60 seconds).
            </p>
            <button
              type="button"
              onClick={() => resetAndFetch(filters, selectedAmenities)}
              className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white"
            >
              Retry
            </button>
          </div>
        ) : listings.length === 0 ? (
          <p className="py-24 text-center text-muted-foreground">No listings found. Try adjusting filters.</p>
        ) : showMap ? (
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 md:gap-x-6">
                {listingGrid}
              </div>
              <div ref={sentinelRef} className="h-10" />
              {loadingMore && (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
              {!hasMore && listings.length > 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Showing all {listings.length} stays
                </p>
              )}
            </div>
            <div className="sticky top-24 hidden h-[calc(100vh-8rem)] overflow-hidden rounded-2xl border border-border shadow-card lg:block">
              <SearchResultsMap
                listings={mapListings.length > 0 ? mapListings : listings}
                selectedId={highlightedId}
                onSelect={setHighlightedId}
                className="h-full w-full"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 md:gap-x-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {listingGrid}
            </div>
            <div ref={sentinelRef} className="h-10" />
            {loadingMore && (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
            {!hasMore && listings.length > 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Showing all {listings.length} stays
              </p>
            )}
          </>
        )}

        <FiltersModal
          open={filtersOpen}
          filters={filters}
          amenities={selectedAmenities}
          onClose={() => setFiltersOpen(false)}
          onApply={(nextFilters, amenities) => {
            setFilters(nextFilters);
            setSelectedAmenities(amenities);
            resetAndFetch(nextFilters, amenities);
          }}
        />

        <MapModal
          open={mapOpen}
          listings={mapListings.length > 0 ? mapListings : listings}
          selectedId={highlightedId}
          onSelect={setHighlightedId}
          onClose={() => setMapOpen(false)}
        />

        {listings.length > 0 && (
          <div className="fixed bottom-8 left-1/2 z-40 -translate-x-1/2 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97]">
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth < 1024) setMapOpen(true);
                else setShowMap((v) => !v);
              }}
              className="shadow-elevated flex items-center gap-2 rounded-full bg-[#222222] px-5 py-3.5 text-xs font-bold text-white hover:bg-black transition-colors"
            >
              {showMap || mapOpen ? (
                <>
                  <span>Show list</span>
                  <List className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span>Show map</span>
                  <Map className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
