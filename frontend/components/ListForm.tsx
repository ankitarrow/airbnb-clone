"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload } from "lucide-react";
import { useToast } from "@/lib/Toast";
import { api } from "@/lib/apis";
import { PROPERTY_TYPE_VALUES } from "@/lib/PropertyTypes";
import { VIBE_VALUES } from "@/lib/Vibes";
import type { ListingDetail } from "@/lib/types";

const AMENITY_OPTIONS = [
  "WiFi", "Kitchen", "Free parking", "Air conditioning", "Washer", "Dryer",
  "Pool", "Hot tub", "TV", "Workspace", "Pet friendly", "Breakfast",
];

type FormState = {
  title: string;
  description: string;
  location_city: string;
  location_area: string;
  lat: string;
  lng: string;
  price_per_night: string;
  property_type: string;
  vibe: string;
  max_guests: string;
  bedrooms: string;
  beds: string;
  bathrooms: string;
  photo_urls: string;
  amenity_names: string[];
};

function buildFormState(existingListing?: ListingDetail): FormState {
  return {
    title: existingListing?.title || "",
    description: existingListing?.description || "",
    location_city: existingListing?.location_city || "",
    location_area: existingListing?.location_area || "",
    lat: existingListing?.lat?.toString() || "",
    lng: existingListing?.lng?.toString() || "",
    price_per_night: existingListing?.price_per_night?.toString() || "",
    property_type: existingListing?.property_type || "Entire home",
    vibe: existingListing?.vibe || "Trending",
    max_guests: existingListing?.max_guests?.toString() || "2",
    bedrooms: existingListing?.bedrooms?.toString() || "1",
    beds: existingListing?.beds?.toString() || "1",
    bathrooms: existingListing?.bathrooms?.toString() || "1",
    photo_urls: existingListing?.photos?.map((p) => p.url).join("\n") || "",
    amenity_names: existingListing?.amenities?.map((a) => a.name) || [],
  };
}

function snapshot(form: FormState) {
  return JSON.stringify(form);
}

interface Props {
  initial?: ListingDetail;
}

export default function ListingForm({ initial: existingListing }: Props) {
  const router = useRouter();
  const { showToast: notify } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const initialFormSnapshot = useMemo(() => snapshot(buildFormState(existingListing)), [existingListing]);
  const [formState, setFormState] = useState<FormState>(() => buildFormState(existingListing));

  const isDirty = snapshot(formState) !== initialFormSnapshot;

  const updateField = (key: keyof FormState, value: string | string[]) =>
    setFormState((f) => ({ ...f, [key]: value }));

  const handleImageUploads = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    const files = Array.from(e.target.files);
    let uploadedUrls: string[] = [];
    
    for (const file of files) {
      try {
        const res = await api.uploadImage(file);
        if (res.url) {
          uploadedUrls.push(res.url);
        }
      } catch (err) {
        notify(`Failed to upload ${file.name}`, "error");
      }
    }
    
    if (uploadedUrls.length > 0) {
      const currentUrls = formState.photo_urls.trim();
      const appended = currentUrls
        ? currentUrls + "\n" + uploadedUrls.join("\n")
        : uploadedUrls.join("\n");
      updateField("photo_urls", appended);
      notify(`Uploaded ${uploadedUrls.length} image(s)`, "success");
    }
    setIsUploading(false);
  };

  const toggleAmenitySelection = (name: string) => {
    setFormState((f) => ({
      ...f,
      amenity_names: f.amenity_names.includes(name)
        ? f.amenity_names.filter((a) => a !== name)
        : [...f.amenity_names, name],
    }));
  };

  const buildPayload = () => ({
    title: formState.title,
    description: formState.description,
    location_city: formState.location_city,
    location_area: formState.location_area,
    lat: formState.lat ? Number(formState.lat) : null,
    lng: formState.lng ? Number(formState.lng) : null,
    price_per_night: Number(formState.price_per_night),
    property_type: formState.property_type,
    vibe: formState.vibe,
    max_guests: Number(formState.max_guests),
    bedrooms: Number(formState.bedrooms),
    beds: Number(formState.beds),
    bathrooms: Number(formState.bathrooms),
    photo_urls: formState.photo_urls.split("\n").map((s) => s.trim()).filter(Boolean),
    amenity_names: formState.amenity_names,
  });

  const saveListing = async (): Promise<boolean> => {
    setIsSaving(true);
    const payload = buildPayload();
    try {
      if (existingListing) {
        await api.updateListing(existingListing.id, payload);
        notify("Listing updated", "success");
      } else {
        await api.createListing(payload);
        notify("Listing created", "success");
      }
      router.push("/hosts");
      return true;
    } catch (err) {
      notify(err instanceof Error ? err.message : "Save failed", "error");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveListing();
  };

  const handleBackNavigation = () => {
    if (isDirty) setShowLeaveConfirm(true);
    else router.push("/hosts");
  };

  const renderField = (label: string, key: keyof FormState, type = "text") => (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        type={type}
        value={formState[key] as string}
        onChange={(e) => updateField(key, e.target.value)}
        required={["title", "description", "location_city", "location_area", "price_per_night"].includes(key)}
        className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/30"
      />
    </div>
  );

  return (
    <>
      <form onSubmit={submitForm} className="mx-auto max-w-2xl space-y-5 px-4 py-8 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackNavigation}
            className="rounded-full p-2 hover:bg-muted"
            aria-label="Back to hosting"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {existingListing ? "Edit listing" : "Create a new listing"}
          </h1>
        </div>

        {renderField("Title", "title")}
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            value={formState.description}
            onChange={(e) => updateField("description", e.target.value)}
            required
            rows={4}
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/30"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {renderField("City", "location_city")}
          {renderField("Area / Neighborhood", "location_area")}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {renderField("Latitude (optional)", "lat")}
          {renderField("Longitude (optional)", "lng")}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {renderField("Price per night (₹)", "price_per_night", "number")}
          <div>
            <label className="mb-1 block text-sm font-medium">Type</label>
            <select
              value={formState.property_type}
              onChange={(e) => updateField("property_type", e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none"
            >
              {PROPERTY_TYPE_VALUES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Vibe</label>
            <select
              value={formState.vibe}
              onChange={(e) => updateField("vibe", e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none"
            >
              {VIBE_VALUES.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {renderField("Max guests", "max_guests", "number")}
          {renderField("Bedrooms", "bedrooms", "number")}
          {renderField("Beds", "beds", "number")}
          {renderField("Bathrooms", "bathrooms", "number")}
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium">Photo URLs (one per line)</label>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-orange-500 hover:text-orange-600">
              <Upload className="h-3.5 w-3.5" />
              Upload to Cloudinary
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleImageUploads}
                disabled={isUploading}
              />
            </label>
          </div>
          <textarea
            value={formState.photo_urls}
            onChange={(e) => updateField("photo_urls", e.target.value)}
            rows={3}
            placeholder="https://images.unsplash.com/..."
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none"
          />
          {isUploading && (
            <p className="mt-1 text-xs text-muted-foreground animate-pulse">Uploading to Cloudinary...</p>
          )}
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Amenities</label>
          <div className="flex flex-wrap gap-2">
            {AMENITY_OPTIONS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggleAmenitySelection(a)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  formState.amenity_names.includes(a)
                    ? "border-orange-500 bg-orange-500/10 text-orange-600"
                    : "border-border hover:bg-muted"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : existingListing ? "Update listing" : "Create listing"}
        </button>
      </form>

      {showLeaveConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !isSaving && setShowLeaveConfirm(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elevated">
            <h2 className="text-lg font-semibold">Discard changes?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You have unsaved changes to this listing. Save them before leaving, or discard and go back.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setShowLeaveConfirm(false);
                  router.push("/hosts");
                }}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                Discard
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={async () => {
                  const didSave = await saveListing();
                  if (didSave) setShowLeaveConfirm(false);
                }}
                className="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save & exit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}