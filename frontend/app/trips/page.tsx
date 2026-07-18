"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SafeImage from "@/components/Booking/Image";
import CancelBookingModal from "@/components/Booking/CancelBooking";
import MessageHostButton from "@/components/HostMessageButton";
import ReviewModal from "@/components/Review/Review";
import EditReviewModal from "@/components/Review/EditReview";
import HostReply from "@/components/HostReplyModal";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/apis";
import type { Booking } from "@/lib/types";
import { useToast } from "@/lib/Toast";

export default function MyTripsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tripBookings, setTripBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [bookingToReview, setBookingToReview] = useState<Booking | null>(null);
  const [reviewBeingEdited, setReviewBeingEdited] = useState<{
    reviewId: number;
    listingTitle: string;
    rating: number;
    comment: string;
  } | null>(null);

  const fetchTripBookings = () => {
    if (!user) return;
    api
      .getMyBookings()
      .then(setTripBookings)
      .catch(() => showToast("Failed to load trips", "error"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    fetchTripBookings();
    const pollInterval = setInterval(fetchTripBookings, 5000);
    const handleWindowFocus = () => fetchTripBookings();
    window.addEventListener("focus", handleWindowFocus);
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("focus", handleWindowFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleBookingCancelled = (updatedBooking: Booking) => {
    setTripBookings((previousBookings) =>
      previousBookings.map((booking) => (booking.id === updatedBooking.id ? updatedBooking : booking))
    );
    showToast(
      updatedBooking.refund_amount != null
        ? `Cancelled. Refund: ₹${updatedBooking.refund_amount.toLocaleString("en-IN")} (${updatedBooking.refund_percent}%)`
        : "Booking cancelled",
      "success"
    );
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">My Trips</h1>
        <p className="mt-2 text-muted-foreground">Log in to see your bookings.</p>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split("T")[0];

  const upcomingTrips = tripBookings.filter(
    (b) => b.status === "confirmed" && b.check_out >= todayStr
  );
  const pastTrips = tripBookings.filter(
    (b) => b.status === "confirmed" && b.check_out < todayStr
  );
  const cancelledTrips = tripBookings.filter(
    (b) => b.status === "cancelled"
  );

  return (
    <main className="mx-auto max-w-4xl px-6 py-8 md:px-10 md:py-10">
      <h1 className="mb-6 text-[28px] font-semibold tracking-tight md:mb-8 md:text-[32px]">My Trips</h1>

      {/* Tab Headers */}
      <div className="mb-8 border-b border-border">
        <div className="flex gap-8">
          {(["upcoming", "past", "cancelled"] as const).map((tabId) => {
            const count =
              tabId === "upcoming"
                ? upcomingTrips.length
                : tabId === "past"
                ? pastTrips.length
                : cancelledTrips.length;
            const label =
              tabId === "upcoming"
                ? "Upcoming trips"
                : tabId === "past"
                ? "Where you've been"
                : "Cancelled trips";
            const isActive = activeTab === tabId;
            return (
              <button
                key={tabId}
                type="button"
                onClick={() => setActiveTab(tabId)}
                className={`border-b-2 pb-4 text-sm font-semibold transition-all relative ${
                  isActive
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{label}</span>
                {count > 0 && (
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : activeTab === "upcoming" && upcomingTrips.length === 0 ? (
        <div className="rounded-2xl border border-border p-12 text-center shadow-sm">
          <p className="text-muted-foreground text-lg font-medium">No upcoming trips booked yet.</p>
          <p className="text-muted-foreground text-sm mt-1">Time to dust off your bags and start planning your next adventure.</p>
          <Link href="/" className="mt-5 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow hover:opacity-95 transition">
            Start exploring
          </Link>
        </div>
      ) : activeTab === "past" && pastTrips.length === 0 ? (
        <div className="rounded-2xl border border-border p-12 text-center shadow-sm">
          <p className="text-muted-foreground text-lg font-medium">You haven&apos;t taken any trips yet.</p>
          <p className="text-muted-foreground text-sm mt-1">Once you complete a stay, it will show up here.</p>
        </div>
      ) : activeTab === "cancelled" && cancelledTrips.length === 0 ? (
        <div className="rounded-2xl border border-border p-12 text-center shadow-sm">
          <p className="text-muted-foreground text-lg font-medium">No cancelled trips.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(activeTab === "upcoming"
            ? upcomingTrips
            : activeTab === "past"
            ? pastTrips
            : cancelledTrips
          ).map((booking) => (
            <div
              key={booking.id}
              className="card-hover flex flex-col gap-5 rounded-2xl border border-border p-5 shadow-sm sm:flex-row sm:items-stretch"
            >
              <Link href={`/listing/${booking.listing_id}`} className="flex flex-1 flex-col gap-4 sm:flex-row">
                <div className="relative h-[110px] w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:h-auto sm:w-[150px]">
                  <SafeImage src={booking.listing_photo} alt="" fill className="object-cover" sizes="(max-width:640px) 100vw, 150px" />
                </div>
                <div className="flex flex-col justify-between py-1">
                  <div>
                    <h3 className="text-lg font-bold leading-tight">{booking.listing_title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{booking.location_city}</p>
                    <p className="mt-2 text-sm text-foreground/80 font-medium">
                      {booking.check_in} → {booking.check_out} · {booking.guests_count} guest{booking.guests_count > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <p className="text-[16px] font-bold">₹{booking.total_price.toLocaleString("en-IN")}</p>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        booking.status === "confirmed"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>
                  {booking.status === "cancelled" && booking.refund_amount != null && (
                    <p className="mt-2 text-xs text-rose-500 font-medium">
                      Refunded ₹{booking.refund_amount.toLocaleString("en-IN")} ({booking.refund_percent}%)
                    </p>
                  )}
                </div>
              </Link>
              <div className="flex shrink-0 flex-row gap-2 border-t border-border/60 pt-4 sm:border-t-0 sm:pt-0 sm:flex-col sm:justify-center sm:items-end">
                {booking.status === "confirmed" && (
                  <MessageHostButton listingId={booking.listing_id} hostId={booking.host_id} className="flex-1 sm:flex-none" />
                )}
                {booking.can_review && (
                  <button
                    type="button"
                    onClick={() => setBookingToReview(booking)}
                    className="flex-1 rounded-xl bg-[#222222] px-4 py-2.5 text-xs font-bold text-white hover:bg-black transition sm:flex-none"
                  >
                    Leave a review
                  </button>
                )}
                {booking.has_review && (
                  <div className="w-full space-y-2 sm:text-right">
                    {booking.host_reply?.trim() ? (
                      <HostReply reply={booking.host_reply} replyAt={booking.host_reply_at} className="sm:ml-auto sm:max-w-xs" />
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground block">Review submitted</span>
                    )}
                    {booking.review_id != null && (
                      <div className="flex flex-wrap gap-3 sm:justify-end">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const writtenReviews = await api.getMyWrittenReviews();
                              const matchingReview = writtenReviews.find((review) => review.id === booking.review_id);
                              if (!matchingReview) {
                                showToast("Could not load your review", "error");
                                return;
                              }
                              setReviewBeingEdited({
                                reviewId: matchingReview.id,
                                listingTitle: matchingReview.listing_title,
                                rating: matchingReview.rating,
                                comment: matchingReview.comment,
                              });
                            } catch {
                              showToast("Could not load your review", "error");
                            }
                          }}
                          className="text-xs font-bold text-primary hover:underline"
                        >
                          Edit review
                        </button>
                        <Link
                          href={`/listing/${booking.listing_id}#review-${booking.review_id}`}
                          className="text-xs font-bold text-primary hover:underline"
                        >
                          View on listing
                        </Link>
                      </div>
                    )}
                  </div>
                )}
                {booking.status === "confirmed" && new Date(booking.check_out) >= new Date() && (
                  <button
                    type="button"
                    onClick={() => setBookingToCancel(booking)}
                    className="flex-1 rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50/50 transition sm:flex-none"
                  >
                    Cancel booking
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {bookingToCancel && (
        <CancelBookingModal
          booking={bookingToCancel}
          open={!!bookingToCancel}
          onClose={() => setBookingToCancel(null)}
          onCancelled={handleBookingCancelled}
        />
      )}

      {bookingToReview && (
        <ReviewModal
          open={!!bookingToReview}
          listingId={bookingToReview.listing_id}
          listingTitle={bookingToReview.listing_title}
          bookingId={bookingToReview.id}
          onClose={() => setBookingToReview(null)}
          onSubmitted={fetchTripBookings}
        />
      )}

      {reviewBeingEdited && (
        <EditReviewModal
          open
          listingTitle={reviewBeingEdited.listingTitle}
          reviewId={reviewBeingEdited.reviewId}
          initialRating={reviewBeingEdited.rating}
          initialComment={reviewBeingEdited.comment}
          onClose={() => setReviewBeingEdited(null)}
          onUpdated={() => {
            setReviewBeingEdited(null);
            fetchTripBookings();
          }}
        />
      )}
    </main>
  );
}