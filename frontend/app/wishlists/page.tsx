"use client";

import { useEffect, useState } from "react";
import ListingCard from "@/components/Landing/Card";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/apis";
import type { ListingCard as ListingCardType } from "@/lib/types";

export default function WishlistsPage() {
  const { user } = useAuth();
  const [savedListings, setSavedListings] = useState<ListingCardType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    api
      .getFavorites()
      .then(setSavedListings)
      .finally(() => setIsLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Wishlists</h1>
        <p className="mt-2 text-muted-foreground">Log in to see your saved listings.</p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 text-3xl font-semibold">Wishlists</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : savedListings.length === 0 ? (
        <p className="text-muted-foreground">No saved listings yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {savedListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isFavorite
              onFavoriteToggle={() => api.getFavorites().then(setSavedListings)}
            />
          ))}
        </div>
      )}
    </main>
  );
}