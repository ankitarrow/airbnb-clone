import type {
  AvailabilityRange,
  Booking,
  ListingCard,
  ListingDetail,
  ListingListResponse,
  Review,
  SearchFilters,
  User,
} from "./types";

const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function resolveCurrentUserId(): number | null {
  if (typeof window === "undefined") return null;
  const storedUser = localStorage.getItem("user");
  if (!storedUser) return null;
  try {
    return JSON.parse(storedUser).id as number;
  } catch {
    return null;
  }
}

async function sendApiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const currentUserId = resolveCurrentUserId();
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (currentUserId) requestHeaders["X-User-Id"] = String(currentUserId);

  const response = await fetch(`${BASE_API_URL}${path}`, { ...options, headers: requestHeaders, cache: "no-store" });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
    const errorDetail = errorBody.detail;
    const errorMessage = Array.isArray(errorDetail)
      ? errorDetail.map((d: { msg?: string }) => d.msg || String(d)).join(", ")
      : errorDetail || "Request failed";
    throw new Error(errorMessage);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

function sanitizeReviewRecord(rawReview: Review): Review {
  return {
    ...rawReview,
    guest_id: rawReview.guest_id ?? 0,
    like_count: rawReview.like_count ?? 0,
    liked_by_me: rawReview.liked_by_me ?? false,
    host_reply: rawReview.host_reply ?? null,
    host_reply_at: rawReview.host_reply_at ?? null,
  };
}

function sanitizeGuestReviewRecord(rawGuestReview: import("./types").GuestReview): import("./types").GuestReview {
  return {
    ...sanitizeReviewRecord(rawGuestReview),
    listing_id: rawGuestReview.listing_id,
    listing_title: rawGuestReview.listing_title,
  };
}

async function sendApiRequestWithRetries<T>(
  path: string,
  options: RequestInit = {},
  maxRetries = 4,
  retryDelayMs = 8000
): Promise<T> {
  let lastCaughtError: unknown;
  for (let attemptIndex = 0; attemptIndex < maxRetries; attemptIndex++) {
    try {
      return await sendApiRequest<T>(path, options);
    } catch (caughtError) {
      lastCaughtError = caughtError;
      if (attemptIndex < maxRetries - 1) {
        await new Promise((resolveFn) => setTimeout(resolveFn, retryDelayMs));
      }
    }
  }
  throw lastCaughtError instanceof Error ? lastCaughtError : new Error("Request failed");
}

export const api = {
  login: (email: string, password: string) =>
    sendApiRequest<User>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  demoLogin: (email: string) =>
    sendApiRequest<User>("/auth/demo-login", { method: "POST", body: JSON.stringify({ email }) }),

  register: (data: { name: string; email: string; password: string; is_host: boolean }) =>
    sendApiRequest<User>("/auth/register", { method: "POST", body: JSON.stringify(data) }),

  me: () => sendApiRequest<User>("/auth/me"),

  verifyIdentity: () =>
    sendApiRequest<User>("/auth/verify-identity", { method: "POST" }),

  uploadImage: async (file: File): Promise<{ url: string }> => {
    const currentUserId = resolveCurrentUserId();
    const headers: Record<string, string> = {};
    if (currentUserId) headers["X-User-Id"] = String(currentUserId);
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${BASE_API_URL}/upload`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!response.ok) {
      throw new Error("Upload failed");
    }
    return response.json();
  },

  getListings: (filters: SearchFilters = {}) => {
    const searchParams = new URLSearchParams();
    const { adults, children, infants, q, ...remainingFilters } = filters;
    if (q) searchParams.set("city", q);
    Object.entries(remainingFilters).forEach(([filterKey, filterValue]) => {
      if (filterValue !== undefined && filterValue !== "" && filterValue !== null) {
        searchParams.set(filterKey, String(filterValue));
      }
    });
    return sendApiRequestWithRetries<ListingListResponse>(`/listings?${searchParams}`);
  },

  getListing: (id: number) => sendApiRequest<ListingDetail>(`/listings/${id}`),

  getAvailability: (id: number) =>
    sendApiRequest<AvailabilityRange[]>(`/listings/${id}/availability`),

  getReviews: (id: number) =>
    sendApiRequest<Review[]>(`/listings/${id}/reviews`).then((rows) => rows.map(sanitizeReviewRecord)),

  createListing: (data: Record<string, unknown>) =>
    sendApiRequest<ListingDetail>("/listings", { method: "POST", body: JSON.stringify(data) }),

  updateListing: (id: number, data: Record<string, unknown>) =>
    sendApiRequest<ListingDetail>(`/listings/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteListing: (id: number) =>
    sendApiRequest<void>(`/listings/${id}`, { method: "DELETE" }),

  createBooking: (data: {
    listing_id: number;
    check_in: string;
    check_out: string;
    guests_count: number;
  }) =>
    sendApiRequest<Booking>("/bookings", { method: "POST", body: JSON.stringify(data) }),

  getMyBookings: () => sendApiRequest<Booking[]>("/bookings/me"),

  getHostListings: () => sendApiRequest<ListingCard[]>("/hosts/me/listings"),

  getHostBookings: () => sendApiRequest<Booking[]>("/hosts/me/bookings"),

  getHostReviews: () => sendApiRequest<import("./types").HostReview[]>("/hosts/me/reviews"),

  cancelBooking: (bookingId: number) =>
    sendApiRequest<Booking>(`/bookings/${bookingId}/cancel`, { method: "PATCH" }),

  getRefundPreview: (bookingId: number) =>
    sendApiRequest<import("./types").RefundPreview>(`/bookings/${bookingId}/refund-preview`),

  getConversations: () => sendApiRequest<import("./types").Conversation[]>("/messages/conversations"),

  startConversation: (listingId: number) =>
    sendApiRequest<import("./types").Conversation>("/messages/conversations", {
      method: "POST",
      body: JSON.stringify({ listing_id: listingId }),
    }),

  startHostConversation: (listingId: number, guestId: number) =>
    sendApiRequest<import("./types").Conversation>("/messages/conversations/for-guest", {
      method: "POST",
      body: JSON.stringify({ listing_id: listingId, guest_id: guestId }),
    }),

  getMessages: (conversationId: number) =>
    sendApiRequest<import("./types").Message[]>(`/messages/conversations/${conversationId}/messages`),

  sendMessage: (conversationId: number, body: string) =>
    sendApiRequest<import("./types").Message>(`/messages/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),

  addFavorite: (listingId: number) =>
    sendApiRequest<{ message: string }>(`/favorites/${listingId}`, { method: "POST" }),

  removeFavorite: (listingId: number) =>
    sendApiRequest<void>(`/favorites/${listingId}`, { method: "DELETE" }),

  getFavorites: () => sendApiRequest<ListingCard[]>("/favorites/me"),

  createReview: (data: {
    listing_id: number;
    booking_id: number;
    rating: number;
    comment: string;
  }) =>
    sendApiRequest<Review>("/reviews", { method: "POST", body: JSON.stringify(data) }),

  toggleReviewLike: (reviewId: number) =>
    sendApiRequest<Review>(`/reviews/${reviewId}/like`, { method: "POST" }),

  replyToReview: (reviewId: number, body: string) =>
    sendApiRequest<import("./types").HostReview>(`/reviews/${reviewId}/reply`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),

  updateReview: (reviewId: number, data: { rating: number; comment: string }) =>
    sendApiRequest<Review>(`/reviews/${reviewId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }).then(sanitizeReviewRecord),

  deleteReview: (reviewId: number) =>
    sendApiRequest<void>(`/reviews/${reviewId}`, { method: "DELETE" }),

  deleteReviewReply: (reviewId: number) =>
    sendApiRequest<import("./types").HostReview>(`/reviews/${reviewId}/reply`, {
      method: "DELETE",
    }),

  getTrackedReviews: () => sendApiRequest<import("./types").ReviewWatch[]>("/reviews/me/tracked"),

  getMyWrittenReviews: () =>
    sendApiRequest<import("./types").GuestReview[]>("/reviews/me/written").then((rows) =>
      rows.map((r) => ({ ...sanitizeReviewRecord(r), listing_id: r.listing_id, listing_title: r.listing_title }))
    ),
};