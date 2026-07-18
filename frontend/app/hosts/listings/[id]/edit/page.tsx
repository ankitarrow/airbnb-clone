"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SafeImage from "@/components/Booking/Image";
import { CalendarDays, Home, MessageSquare, Plus, Star, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/apis";
import { formatMessageTimestamp } from "@/lib/date";
import type { Booking, HostReview, ListingCard } from "@/lib/types";
import { useToast } from "@/lib/Toast";
import ReviewEngagement from "@/components/Review/ReviewManagement";

type DashboardTab = "listings" | "bookings" | "reviews";

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, starIndex) => (
        <Star
          key={starIndex}
          className={`h-3.5 w-3.5 ${starIndex < rating ? "fill-foreground" : "fill-muted text-muted"}`}
        />
      ))}
    </div>
  );
}

export default function HostingDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<DashboardTab>("listings");
  const [hostListings, setHostListings] = useState<ListingCard[]>([]);
  const [hostBookings, setHostBookings] = useState<Booking[]>([]);
  const [hostReviews, setHostReviews] = useState<HostReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listingToDelete, setListingToDelete] = useState<ListingCard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [messagingBookingId, setMessagingBookingId] = useState<number | null>(null);

  const loadDashboardData = () => {
    setIsLoading(true);
    Promise.all([api.getHostListings(), api.getHostBookings(), api.getHostReviews()])
      .then(([fetchedListings, fetchedBookings, fetchedReviews]) => {
        setHostListings(fetchedListings);
        setHostBookings(fetchedBookings);
        setHostReviews(fetchedReviews);
      })
      .catch(() => showToast("Failed to load dashboard", "error"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (user?.is_host) loadDashboardData();
    else setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user?.is_host || activeTab !== "reviews") return;
    const pollReviews = () => {
      api.getHostReviews().then(setHostReviews).catch(() => {});
    };
    pollReviews();
    const pollInterval = setInterval(pollReviews, 4000);
    const handleWindowFocus = () => pollReviews();
    window.addEventListener("focus", handleWindowFocus);
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [user, activeTab]);

  const handleConfirmDelete = async () => {
    if (!listingToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteListing(listingToDelete.id);
      showToast("Listing deleted", "success");
      setListingToDelete(null);
      loadDashboardData();
    } catch (deleteError) {
      showToast(deleteError instanceof Error ? deleteError.message : "Delete failed", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const openGuestConversation = async (booking: Booking) => {
    setMessagingBookingId(booking.id);
    try {
      const conversation = await api.startHostConversation(booking.listing_id, booking.guest_id);
      router.push(`/inbox/${conversation.id}`);
    } catch (conversationError) {
      showToast(
        conversationError instanceof Error ? conversationError.message : "Could not open conversation",
        "error"
      );
    } finally {
      setMessagingBookingId(null);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Host Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Log in as a host to manage listings.</p>
      </div>
    );
  }

  if (!user.is_host) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Host Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Your account is a guest account. Log in as a host demo account (Priya, Sarah, Marcus, James, or David).
        </p>
      </div>
    );
  }

  const getTabButtonClass = (isActive: boolean) =>
    `flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
      isActive
        ? "bg-foreground text-background shadow-sm"
        : "border border-border bg-card text-foreground hover:bg-muted/50"
    }`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[28px] font-semibold tracking-tight md:text-[32px]">Hosting</h1>
        {activeTab === "listings" && (
          <Link
            href="/hosts/listings/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            New listing
          </Link>
        )}
      </div>

      <div className="mb-8 grid grid-cols-3 gap-2">
        <button type="button" className={getTabButtonClass(activeTab === "listings")} onClick={() => setActiveTab("listings")}>
          <Home className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Your listings</span>
          <span className="sm:hidden">Listings</span>
          {!isLoading && (
            <span className={`rounded-full px-2 py-0.5 text-xs ${activeTab === "listings" ? "bg-background/20" : "bg-muted"}`}>
              {hostListings.length}
            </span>
          )}
        </button>
        <button type="button" className={getTabButtonClass(activeTab === "bookings")} onClick={() => setActiveTab("bookings")}>
          <CalendarDays className="h-4 w-4 shrink-0" />
          Bookings
          {!isLoading && (
            <span className={`rounded-full px-2 py-0.5 text-xs ${activeTab === "bookings" ? "bg-background/20" : "bg-muted"}`}>
              {hostBookings.length}
            </span>
          )}
        </button>
        <button type="button" className={getTabButtonClass(activeTab === "reviews")} onClick={() => setActiveTab("reviews")}>
          <Star className="h-4 w-4 shrink-0" />
          Reviews
          {!isLoading && (
            <span className={`rounded-full px-2 py-0.5 text-xs ${activeTab === "reviews" ? "bg-background/20" : "bg-muted"}`}>
              {hostReviews.length}
            </span>
          )}
        </button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : activeTab === "listings" ? (
        hostListings.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
            <Home className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">No listings yet.</p>
            <Link
              href="/hosts/listings/new"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Create your first listing
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {hostListings.map((listing) => (
              <div
                key={listing.id}
                className="card-hover flex items-center gap-4 rounded-2xl border border-border p-4 shadow-sm"
              >
                <div className="relative h-[72px] w-[108px] shrink-0 overflow-hidden rounded-xl bg-muted">
                  <SafeImage src={listing.photo_url} alt="" fill className="object-cover" sizes="96px" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{listing.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {listing.location_city} · ₹{listing.price_per_night.toLocaleString("en-IN")}/night
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/hosts/listings/${listing.id}/edit`}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => setListingToDelete(listing)}
                    className="rounded-lg border border-border p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                    aria-label="Delete listing"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === "bookings" ? (
        hostBookings.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
          <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">No bookings on your listings yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {hostBookings.map((booking) => (
            <div key={booking.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold">{booking.listing_title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Guest: {booking.guest_name} · {booking.check_in} → {booking.check_out} · {booking.guests_count} guests
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    ₹{booking.total_price.toLocaleString("en-IN")} ·{" "}
                    <span className="capitalize text-muted-foreground">{booking.status}</span>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={messagingBookingId === booking.id}
                  onClick={() => openGuestConversation(booking)}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  <MessageSquare className="h-4 w-4" />
                  {messagingBookingId === booking.id ? "Opening..." : "Message guest"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )
      ) : hostReviews.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
          <Star className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">No reviews on your listings yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {hostReviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Link
                    href={`/listing/${review.listing_id}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {review.listing_title}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {review.guest_name} · {formatMessageTimestamp(review.created_at)}
                  </p>
                </div>
                <RatingStars rating={review.rating} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">{review.comment}</p>
              <ReviewEngagement
                review={review}
                canReply
                onUpdate={(updatedReview) =>
                  setHostReviews((previousReviews) =>
                    previousReviews.map((item) => (item.id === updatedReview.id ? (updatedReview as HostReview) : item)),
                  )
                }
              />
            </article>
          ))}
        </div>
      )}

      {listingToDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isDeleting && setListingToDelete(null)} aria-hidden />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elevated">
            <h2 className="text-lg font-semibold">Delete listing?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{listingToDelete.title}</span> will be permanently
              removed, along with its bookings, reviews, and messages. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setListingToDelete(null)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete listing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}