"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Star, MapPin } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/apis";
import type { Conversation, Message, ListingDetail } from "@/lib/types";
import { formatMessageTimestamp } from "@/lib/date";
import { useToast } from "@/lib/Toast";
import SafeImage from "@/components/Booking/Image";

export default function MessageThreadPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = Number(params.id);
  const { user } = useAuth();
  const previousUserIdRef = useRef<number | null>(null);
  const { showToast } = useToast();

  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [listingDetail, setListingDetail] = useState<ListingDetail | null>(null);
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  const loadConversationThread = async () => {
    const currentUserId = user?.id;
    if (!currentUserId) return;
    try {
      const [allConversations, conversationMessages] = await Promise.all([
        api.getConversations(),
        api.getMessages(conversationId),
      ]);
      if (user?.id !== currentUserId) return;
      const conv = allConversations.find((conversationItem) => conversationItem.id === conversationId) ?? null;
      setActiveConversation(conv);
      setThreadMessages(conversationMessages);
    } catch {
      showToast("Failed to load conversation", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !conversationId) return;

    if (previousUserIdRef.current !== null && previousUserIdRef.current !== user.id) {
      router.replace("/inbox");
      return;
    }
    previousUserIdRef.current = user.id;
    loadConversationThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, conversationId]);

  useEffect(() => {
    if (!user || !conversationId) return;
    const pollInterval = setInterval(loadConversationThread, 5000);
    const handleWindowFocus = () => loadConversationThread();
    window.addEventListener("focus", handleWindowFocus);
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("focus", handleWindowFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, conversationId]);

  useEffect(() => {
    if (activeConversation) {
      api.getListing(activeConversation.listing_id)
        .then(setListingDetail)
        .catch(() => {});
    }
  }, [activeConversation]);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages]);

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedBody = messageText.trim();
    if (!trimmedBody) return;
    setIsSending(true);
    try {
      const sentMessage = await api.sendMessage(conversationId, trimmedBody);
      setThreadMessages((previousMessages) => [...previousMessages, sentMessage]);
      setMessageText("");
    } catch (sendError) {
      showToast(sendError instanceof Error ? sendError.message : "Send failed", "error");
    } finally {
      setIsSending(false);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="text-muted-foreground">Log in to view messages.</p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 md:px-10 lg:h-[calc(100vh-100px)] lg:grid lg:grid-cols-[1fr_360px] lg:gap-10">
      {/* Left Column: Chat feed */}
      <div className="flex flex-col h-full bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
        {/* Chat Header */}
        <div className="flex items-center gap-3 border-b border-border/60 bg-background px-4 py-4">
          <Link href="/inbox" className="rounded-full p-2 hover:bg-muted" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold leading-tight">
              Chat with {activeConversation?.other_user_name ?? "Host"}
            </p>
            <p className="truncate text-xs text-muted-foreground mt-0.5">
              {activeConversation?.listing_title ?? "..."}
            </p>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : threadMessages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Say hello to {activeConversation?.other_user_name} about this stay.
            </p>
          ) : (
            <div className="space-y-4">
              {threadMessages.map((message) => {
                const isOwnMessage = message.sender_id === user.id;
                return (
                  <div key={message.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                        isOwnMessage
                          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-black"
                          : "border border-border bg-card text-foreground"
                      }`}
                    >
                      {!isOwnMessage && (
                        <p className="mb-1 text-[11px] font-bold text-muted-foreground">{message.sender_name}</p>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.body}</p>
                      <p className={`mt-1 text-[9px] text-right font-medium ${isOwnMessage ? "text-white/60 dark:text-black/60" : "text-muted-foreground"}`}>
                        {formatMessageTimestamp(message.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollAnchorRef} />
            </div>
          )}
        </div>

        {/* Send Input Form */}
        <form onSubmit={handleSendMessage} className="border-t border-border/60 bg-background px-4 py-4">
          <div className="flex gap-2">
            <input
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              placeholder="Write a message..."
              className="flex-1 rounded-full border border-border bg-card px-4 py-3.5 text-sm outline-none transition focus:border-foreground"
            />
            <button
              type="submit"
              disabled={isSending || !messageText.trim()}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white hover:opacity-95 disabled:opacity-40 transition-opacity"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Right Column: Listing Detail card (hidden on smaller screens) */}
      <div className="hidden lg:block h-full">
        {listingDetail ? (
          <div className="sticky top-24 rounded-2xl border border-border bg-card overflow-hidden shadow-sm flex flex-col">
            <Link href={`/listing/${listingDetail.id}`} className="relative aspect-[16/10] overflow-hidden bg-muted">
              <SafeImage src={listingDetail.photos[0]?.url} alt="" fill className="object-cover transition duration-300 hover:scale-[1.02]" />
            </Link>
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <Link href={`/listing/${listingDetail.id}`} className="hover:underline">
                  <h3 className="font-bold text-base line-clamp-2 leading-snug">{listingDetail.title}</h3>
                </Link>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{listingDetail.location_area}, {listingDetail.location_city}</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4 text-sm text-foreground/80 font-medium">
                  <span>Type</span>
                  <span>{listingDetail.property_type}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-foreground/80 font-medium">
                  <span>Vibe</span>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{listingDetail.vibe}</span>
                </div>
                {listingDetail.avg_rating != null && (
                  <div className="mt-2 flex items-center justify-between text-sm text-foreground/80 font-medium">
                    <span>Rating</span>
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <Star className="h-3.5 w-3.5 fill-foreground" />
                      {listingDetail.avg_rating.toFixed(1)} ({listingDetail.review_count} reviews)
                    </span>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between text-sm text-foreground/80 font-medium">
                  <span>Price per night</span>
                  <span className="font-bold text-foreground">₹{listingDetail.price_per_night.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="mt-6 border-t border-border/40 pt-4">
                <Link
                  href={`/listing/${listingDetail.id}`}
                  className="block w-full text-center rounded-xl bg-primary py-3 text-xs font-bold text-white shadow hover:opacity-95 transition"
                >
                  View listing detail page
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="sticky top-24 h-[420px] rounded-2xl border border-border/60 bg-muted/30 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
            Loading listing details...
          </div>
        )}
      </div>
    </main>
  );
}