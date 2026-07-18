"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Photo } from "@/lib/types";
import SafeImage from "@/components/Booking/Image";

interface Props {
  photos: Photo[];
  title: string;
}

export default function Gallery({ photos, title }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const sortedPhotos = [...photos].sort((a, b) => a.sort_order - b.sort_order);

  if (sortedPhotos.length === 0) {
    return (
      <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-2xl bg-muted">
        <SafeImage src={null} alt={title} fill className="object-cover" sizes="100vw" />
      </div>
    );
  }

  const goToPrevious = () =>
    setSelectedIndex((i) => (i === 0 ? sortedPhotos.length - 1 : i - 1));
  const goToNext = () =>
    setSelectedIndex((i) => (i === sortedPhotos.length - 1 ? 0 : i + 1));

  return (
    <div className="space-y-3">
      <div className="group relative aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
        <SafeImage
          src={sortedPhotos[selectedIndex].url}
          alt={`${title} - photo ${selectedIndex + 1}`}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />

        {sortedPhotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={goToPrevious}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 transition hover:bg-black/70 group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goToNext}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 transition hover:bg-black/70 group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
              {selectedIndex + 1} / {sortedPhotos.length}
            </span>
          </>
        )}
      </div>

      {sortedPhotos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sortedPhotos.map((photo, index) => (
            <button
              key={photo.id}
              onClick={() => setSelectedIndex(index)}
              className={`relative h-20 w-28 shrink-0 overflow-hidden rounded-lg ${
                index === selectedIndex ? "ring-2 ring-teal-600" : "opacity-80 hover:opacity-100"
              }`}
            >
              <SafeImage src={photo.url} alt="" fill className="object-cover" sizes="112px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}