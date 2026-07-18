"use client";

import { useState } from "react";
import { Heart, MessageSquareReply, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/apis";
import { formatMessageTimestamp } from "@/lib/date";
import { useToast } from "@/lib/Toast";
import type { HostReview, Review } from "@/lib/types";

interface Props {
  review: Review;
  canReply?: boolean;
  canEditReview?: boolean;
  onUpdate: (review: Review | HostReview) => void;
  onDelete?: (reviewId: number) => void;
  onEdit?: (review: Review | HostReview) => void;
}

export default function ReviewEngagement({
  review,
  canReply = false,
  canEditReview = false,
  onUpdate,
  onDelete,
  onEdit,
}: Props) {
  const { user } = useAuth();
  const { showToast: notify } = useToast();
  const [isLiking, setIsLiking] = useState(false);
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState(review.host_reply ?? "");
  const [isPostingReply, setIsPostingReply] = useState(false);
  const [isDeletingReview, setIsDeletingReview] = useState(false);
  const [isDeletingReply, setIsDeletingReply] = useState(false);

  const handleToggleLike = async () => {
    if (!user) {
      notify("Log in to like reviews", "error");
      return;
    }
    setIsLiking(true);
    try {
      const updatedFields = await api.toggleReviewLike(review.id);
      const mergedReview = { ...review, ...updatedFields };
      onUpdate(mergedReview);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not update like", "error");
    } finally {
      setIsLiking(false);
    }
  };

  const handlePostReply = async () => {
    const trimmedReply = replyDraft.trim();
    if (!trimmedReply) {
      notify("Write a reply first", "error");
      return;
    }
    setIsPostingReply(true);
    try {
      const updatedReview = await api.replyToReview(review.id, trimmedReply);
      onUpdate(updatedReview);
      setIsReplyOpen(false);
      notify("Reply posted", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not post reply", "error");
    } finally {
      setIsPostingReply(false);
    }
  };

  const handleDeleteReply = async () => {
    if (!window.confirm("Delete your response to this review?")) return;
    setIsDeletingReply(true);
    try {
      const updatedReview = await api.deleteReviewReply(review.id);
      onUpdate(updatedReview);
      setIsReplyOpen(false);
      setReplyDraft("");
      notify("Reply deleted", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not delete reply", "error");
    } finally {
      setIsDeletingReply(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!window.confirm("Delete your review permanently?")) return;
    setIsDeletingReview(true);
    try {
      await api.deleteReview(review.id);
      notify("Review deleted", "success");
      onDelete?.(review.id);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not delete review", "error");
    } finally {
      setIsDeletingReview(false);
    }
  };

  return (
    <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={isLiking}
          onClick={handleToggleLike}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
            review.liked_by_me
              ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"
              : "border-border hover:bg-muted/50"
          }`}
        >
          <Heart className={`h-4 w-4 ${review.liked_by_me ? "fill-current" : ""}`} />
          {review.like_count > 0 ? review.like_count : "Like"}
        </button>

        {canEditReview && (
          <>
            <button
              type="button"
              onClick={() => onEdit?.(review)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted/50"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
            <button
              type="button"
              disabled={isDeletingReview}
              onClick={handleDeleteReview}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/50 dark:hover:bg-rose-950/30"
            >
              <Trash2 className="h-4 w-4" />
              {isDeletingReview ? "Deleting..." : "Delete"}
            </button>
          </>
        )}

        {canReply && (
          <>
            <button
              type="button"
              onClick={() => {
                setReplyDraft(review.host_reply ?? "");
                setIsReplyOpen((open) => !open);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted/50"
            >
              <MessageSquareReply className="h-4 w-4" />
              {review.host_reply ? "Edit reply" : "Reply"}
            </button>
            {review.host_reply && (
              <button
                type="button"
                disabled={isDeletingReply}
                onClick={handleDeleteReply}
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/50 dark:hover:bg-rose-950/30"
              >
                <Trash2 className="h-4 w-4" />
                {isDeletingReply ? "Deleting..." : "Delete reply"}
              </button>
            )}
          </>
        )}
      </div>

      {canReply && review.host_reply && (
        <div className="rounded-xl bg-muted/40 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your response</p>
          <p className="mt-1 text-sm leading-relaxed">{review.host_reply}</p>
          {review.host_reply_at && (
            <p className="mt-2 text-xs text-muted-foreground">
              {formatMessageTimestamp(review.host_reply_at)}
            </p>
          )}
        </div>
      )}

      {canReply && isReplyOpen && (
        <div className="space-y-2">
          <textarea
            value={replyDraft}
            onChange={(e) => setReplyDraft(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Thank your guest or address their feedback..."
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none ring-cyan-600 focus:ring-2"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPostingReply}
              onClick={handlePostReply}
              className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
            >
              {isPostingReply ? "Posting..." : review.host_reply ? "Update reply" : "Post reply"}
            </button>
            <button
              type="button"
              disabled={isPostingReply}
              onClick={() => setIsReplyOpen(false)}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}