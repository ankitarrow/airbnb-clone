"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import SafeImage from "@/components/Booking/Image";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/apis";
import type { Conversation } from "@/lib/types";
import { formatRelativeTimestamp } from "@/lib/date";
import { useToast } from "@/lib/Toast";

function ConversationRow({ conversation }: { conversation: Conversation }) {
  return (
    <Link
      href={`/inbox/${conversation.id}`}
      className="card-hover flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
        <SafeImage src={conversation.listing_photo} alt="" fill className="object-cover" sizes="56px" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-semibold">{conversation.other_user_name}</p>
          <div className="flex shrink-0 items-center gap-2">
            {conversation.last_message_at && (
              <span className="text-[11px] text-muted-foreground">
                {formatRelativeTimestamp(conversation.last_message_at)}
              </span>
            )}
            {conversation.unread_count > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
                {conversation.unread_count}
              </span>
            )}
          </div>
        </div>
        <p className="truncate text-sm text-muted-foreground">{conversation.listing_title}</p>
        {conversation.last_message && (
          <p className="mt-0.5 truncate text-sm">{conversation.last_message}</p>
        )}
      </div>
    </Link>
  );
}

function EmptyInboxState() {
  return (
    <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
      <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
      <p className="mt-4 text-muted-foreground">No messages yet.</p>
      <Link href="/" className="mt-4 inline-block font-medium text-primary underline">
        Explore stays
      </Link>
    </div>
  );
}

export default function MessagesInboxPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [conversationList, setConversationList] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    const fetchConversations = () =>
      api
        .getConversations()
        .then(setConversationList)
        .catch(() => showToast("Failed to load inbox", "error"))
        .finally(() => setIsLoading(false));

    fetchConversations();
    const pollInterval = setInterval(fetchConversations, 8000);
    return () => clearInterval(pollInterval);
  }, [user, showToast]);

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <p className="mt-2 text-muted-foreground">Log in to view your messages.</p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:py-10">
      <h1 className="mb-6 text-[28px] font-semibold tracking-tight md:mb-8 md:text-[32px]">Inbox</h1>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : conversationList.length === 0 ? (
        <EmptyInboxState />
      ) : (
        <div className="space-y-3">
          {conversationList.map((conversation) => (
            <ConversationRow key={conversation.id} conversation={conversation} />
          ))}
        </div>
      )}
    </main>
  );
}