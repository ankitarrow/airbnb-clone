"use client";

import { useEffect, useState } from "react";
import { X, Star } from "lucide-react";
import { api } from "@/lib/apis";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/Toast";
import type { GuestReview, Review } from "@/lib/types";

interface Props {
  open: boolean;
  listingTitle: string;
  reviewId: number;
  initialRating: number;
  initialComment: string;
  onClose: () => void;
  onUpdated: (review: Review | GuestReview) => void;
}

export default function EditReviewModal({
  open: isOpen,
  listingTitle,
  reviewId,
  initialRating,
  initialComment,
  onClose: handleClose,
  onUpdated: onReviewUpdated,
}: Props) {
  const { user } = useAuth();
  const { showToast: notify } = useToast();
  const [selectedRating, setSelectedRating] = useState(initialRating);
  const [commentText, setCommentText] = useState(initialComment);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedRating(initialRating);
      setCommentText(initialComment);
    }
  }, [isOpen, initialRating, initialComment]);

  if (!isOpen) return null;

  const submitReview = async () => {
    if (!commentText.trim()) {
      notify("Please write a short comment", "error");
      return;
    }
    setIsSaving(true);
    try {
      const updatedReview = await api.updateReview(reviewId, {
        rating: selectedRating,
        comment: commentText.trim(),
      });

      notify("Review updated", "success");
      onReviewUpdated(updatedReview);
      handleClose();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not update review", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-md">
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-card bg-amber-500 text-white shadow-sm">
            <Star className="h-6 w-6 fill-white" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500" />

          <div className="p-6 pt-9">
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4 text-center">
              <h2 className="text-xl font-semibold tracking-tight">Edit review</h2>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{listingTitle}</p>
            </div>

            <div className="mb-4 flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSelectedRating(n)}
                  aria-label={`${n} stars`}
                  className="transition hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      n <= selectedRating ? "fill-amber-500 text-amber-500" : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>

            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={4}
              placeholder="Share your experience..."
              className="mb-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
            />

            <button
              type="button"
              onClick={submitReview}
              disabled={isSaving}
              className="w-full rounded-xl bg-amber-500 py-3 font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}