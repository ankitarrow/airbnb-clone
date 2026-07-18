"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Star, MapPin } from "lucide-react";
import Gallery from "@/components/Booking/Gallery";
import BookingSummary from "@/components/Booking/SummaryBooking";
import ListingMobileBookingBar from "@/components/Booking/ListMobileBookingBar";
import BookingModal from "@/components/Booking/Booking";
import ReviewsSection from "@/components/Review/ReviewsSection";
import EditReviewModal from "@/components/Review/EditReview";
import MessageHostButton from "@/components/HostMessageButton";
import { api } from "@/lib/apis";
import type { AvailabilityRange, ListingDetail, Review } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/Toast";
import { useIdentityVerification } from "@/lib/IdentityVerification";
import { rangeOverlapsBlocked } from "@/lib/date";

const ListingMap = dynamic(() => import("@/components/Map/Map"), {
  ssr: false,
  loading: () => <div className="h-[320px] animate-pulse rounded-xl bg-muted" />,
});

interface ListingDetailClientProps {
  id: number;
}

export default function ListingDetailClient({ id }: ListingDetailClientProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { openVerification } = useIdentityVerification();
  const [listingDetail, setListingDetail] = useState<ListingDetail | null>(null);
  const [listingReviews, setListingReviews] = useState<Review[]>([]);
  const [blockedRanges, setBlockedRanges] = useState<AvailabilityRange[]>([]);
  const [selectedCheckIn, setSelectedCheckIn] = useState<string>();
  const [selectedCheckOut, setSelectedCheckOut] = useState<string>();
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [infantCount, setInfantCount] = useState(0);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [highlightedReviewId, setHighlightedReviewId] = useState<number | null>(null);
  const [reviewBeingEdited, setReviewBeingEdited] = useState<Review | null>(null);

  const totalGuestCount = adultCount + childCount;

  const loadListingData = () => {
    Promise.all([api.getListing(id), api.getReviews(id), api.getAvailability(id)])
      .then(([listingData, reviewsData, availabilityData]) => {
        setListingDetail(listingData);
        setListingReviews(reviewsData);
        setBlockedRanges(availabilityData);
      })
      .catch(() => showToast("Failed to load listing", "error"));
  };

  useEffect(() => {
    loadListingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const parseReviewHash = () => {
      const hashMatch = window.location.hash.match(/^#review-(\d+)$/);
      setHighlightedReviewId(hashMatch ? Number(hashMatch[1]) : null);
    };
    parseReviewHash();
    window.addEventListener("hashchange", parseReviewHash);
    return () => window.removeEventListener("hashchange", parseReviewHash);
  }, [id, pathname]);

  useEffect(() => {
    if (listingReviews.length === 0) return;
    const hashMatch = window.location.hash.match(/^#review-(\d+)$/);
    if (hashMatch) setHighlightedReviewId(Number(hashMatch[1]));
  }, [listingReviews]);

  useEffect(() => {
    const pollReviews = () => {
      api
        .getReviews(id)
        .then((freshReviews) => setListingReviews(freshReviews))
        .catch(() => {});
    };
    pollReviews();
    const pollInterval = setInterval(pollReviews, 3000);
    const handleWindowFocus = () => pollReviews();
    window.addEventListener("focus", handleWindowFocus);
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [id]);

  useEffect(() => {
    const refreshAvailability = () => api.getAvailability(id).then(setBlockedRanges).catch(() => {});
    window.addEventListener("focus", refreshAvailability);
    return () => window.removeEventListener("focus", refreshAvailability);
  }, [id]);

  const handleReserveClick = () => {
    if (!user) {
      showToast("Please log in to book", "error");
      return;
    }
    if (!user.identity_verified) {
      showToast("Verify your identity before booking", "error");
      openVerification();
      return;
    }
    if (!selectedCheckIn || !selectedCheckOut) {
      showToast("Please select check-in and checkout dates", "error");
      return;
    }
    if (rangeOverlapsBlocked(selectedCheckIn, selectedCheckOut, blockedRanges)) {
      showToast("Some nights in this range are already booked", "error");
      return;
    }
    if (totalGuestCount < 1) {
      showToast("Please add at least one guest", "error");
      return;
    }
    if (totalGuestCount > (listingDetail?.max_guests ?? 1)) {
      showToast(`This place fits up to ${listingDetail?.max_guests} guests`, "error");
      return;
    }
    setIsBookingModalOpen(true);
  };

  const sharedBookingProps = {
    pricePerNight: listingDetail?.price_per_night ?? 0,
    checkIn: selectedCheckIn,
    checkOut: selectedCheckOut,
    adults: adultCount,
    children: childCount,
    infants: infantCount,
    maxGuests: listingDetail?.max_guests ?? 1,
    blockedRanges,
    onDateChange: (nextCheckIn: string | undefined, nextCheckOut: string | undefined) => {
      setSelectedCheckIn(nextCheckIn);
      setSelectedCheckOut(nextCheckOut);
    },
    onGuestsChange: (guestCounts: { adults: number; children: number; infants: number }) => {
      setAdultCount(guestCounts.adults);
      setChildCount(guestCounts.children);
      setInfantCount(guestCounts.infants);
    },
    onReserve: handleReserveClick,
  };

  if (!listingDetail) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center text-muted-foreground">
        Loading listing...
      </div>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-[1120px] px-6 py-6 pb-28 md:px-10 md:py-8 lg:pb-8">
        <h1 className="mb-2 text-[26px] font-semibold leading-tight tracking-tight md:text-[28px]">
          {listingDetail.title}
        </h1>
        <div className="mb-5 flex flex-wrap items-center gap-3 text-sm md:mb-6">
          {listingDetail.review_count > 0 && listingDetail.avg_rating != null && (
            <span className="flex items-center gap-1 font-medium">
              <Star className="h-4 w-4 fill-foreground" />
              {listingDetail.avg_rating.toFixed(1)} · {listingDetail.review_count} reviews
            </span>
          )}
          <span className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {listingDetail.location_area}, {listingDetail.location_city}
          </span>
        </div>

        <Gallery photos={listingDetail.photos} title={listingDetail.title} />

        <div className="mt-10 grid gap-12 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            <div className="border-b border-border/80 pb-8">
              <h2 className="text-[22px] font-semibold">
                {listingDetail.property_type} · {listingDetail.vibe} · hosted by {listingDetail.host.name}
              </h2>
              <div className="mt-3">
                <MessageHostButton listingId={listingDetail.id} hostId={listingDetail.host.id} />
              </div>
              <p className="mt-1 text-muted-foreground">
                {listingDetail.max_guests} guests · {listingDetail.bedrooms} bedrooms · {listingDetail.beds} beds ·{" "}
                {listingDetail.bathrooms} baths
              </p>
            </div>

            <p className="leading-relaxed text-[15px]">{listingDetail.description}</p>

            {listingDetail.amenities.length > 0 && (
              <div>
                <h3 className="mb-5 text-[22px] font-semibold">What this place offers</h3>
                <div className="grid grid-cols-2 gap-4">
                  {listingDetail.amenities.map((amenity) => (
                    <div key={amenity.id} className="text-[15px]">
                      {amenity.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-5 text-[22px] font-semibold">Where you&apos;ll be</h3>
              {listingDetail.lat && listingDetail.lng ? (
                <div className="overflow-hidden rounded-xl border border-border shadow-sm">
                  <ListingMap
                    lat={listingDetail.lat}
                    lng={listingDetail.lng}
                    title={listingDetail.title}
                    pricePerNight={listingDetail.price_per_night}
                  />
                </div>
              ) : (
                <div className="flex h-[320px] items-center justify-center rounded-xl border border-border bg-muted text-sm text-muted-foreground">
                  Map unavailable for this listing
                </div>
              )}
            </div>

            <ReviewsSection
              reviews={listingReviews}
              avgRating={listingDetail.avg_rating}
              reviewCount={listingDetail.review_count}
              highlightReviewId={highlightedReviewId}
              currentUserId={user?.id}
              onReviewUpdate={(updatedReview) =>
                setListingReviews((previousReviews) =>
                  previousReviews.map((review) => (review.id === updatedReview.id ? updatedReview : review))
                )
              }
              onReviewDelete={(reviewId) =>
                setListingReviews((previousReviews) => previousReviews.filter((review) => review.id !== reviewId))
              }
              onReviewEdit={(review) => setReviewBeingEdited(review)}
            />
          </div>

          <div className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
            <BookingSummary {...sharedBookingProps} />
          </div>
        </div>

        {selectedCheckIn && selectedCheckOut && (
          <BookingModal
            open={isBookingModalOpen}
            listing={listingDetail}
            checkIn={selectedCheckIn}
            checkOut={selectedCheckOut}
            guests={totalGuestCount}
            onClose={() => setIsBookingModalOpen(false)}
            onSuccess={() => {
              api.getAvailability(id).then(setBlockedRanges);
            }}
          />
        )}
      </main>

      <ListingMobileBookingBar {...sharedBookingProps} />

      {reviewBeingEdited && listingDetail && (
        <EditReviewModal
          open
          listingTitle={listingDetail.title}
          reviewId={reviewBeingEdited.id}
          initialRating={reviewBeingEdited.rating}
          initialComment={reviewBeingEdited.comment}
          onClose={() => setReviewBeingEdited(null)}
          onUpdated={(updatedReview) => {
            setListingReviews((previousReviews) =>
              previousReviews.map((review) => (review.id === updatedReview.id ? { ...review, ...updatedReview } : review))
            );
            setReviewBeingEdited(null);
          }}
        />
      )}
    </>
  );
}