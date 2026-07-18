"use client";

import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/Toast";
import { api } from "@/lib/apis";

interface Props {
  listingId: number;
  hostId: number;
  className?: string;
  variant?: "primary" | "outline";
}

export default function MessageHostButton({
  listingId,
  hostId,
  className = "",
  variant = "outline",
}: Props) {
  const { user, refreshSession } = useAuth();
  const { showToast: notify } = useToast();
  const router = useRouter();

  if (user && user.id === hostId) return null;

  const handleMessageHostClick = async () => {
    if (!user) {
      notify("Please log in to message the host", "error");
      return;
    }
    try {
      await refreshSession();
      const conversation = await api.startConversation(listingId);
      router.push(`/inbox/${conversation.id}`);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Could not start conversation";
      if (errorMessage.includes("Not authenticated") || errorMessage.includes("User not found")) {
        notify("Session expired — please log in again", "error");
      } else {
        notify(errorMessage, "error");
      }
    }
  };

  const variantStyles =
    variant === "primary"
      ? "bg-cyan-600 text-white hover:bg-cyan-700"
      : "border border-cyan-600/30 bg-card text-cyan-700 hover:bg-cyan-600/5 dark:text-cyan-400";

  return (
    <button
      type="button"
      onClick={handleMessageHostClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${variantStyles} ${className}`}
    >
      <MessageCircle className="h-4 w-4" />
      Message host
    </button>
  );
}