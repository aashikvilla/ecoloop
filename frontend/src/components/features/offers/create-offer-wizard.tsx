"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { useLiveHousehold } from "@/lib/live-household";
import { readCanonicalRecords, type KitchenObservation } from "@/lib/canonical-api";
import {
  analyzeOfferMedia,
  createOfferDraft,
  editOffer,
  fetchMyOrganizations,
  fetchOffer,
  publishOffer,
  uploadOfferMedia,
  type DonorActor,
  type OfferAnalyzeResult,
  type OfferUnit,
  type SurplusOffer,
} from "@/lib/canonical-offers";

function localDateTimeInput(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function CreateOfferWizard({ editOfferId }: { editOfferId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const household = useLiveHousehold();
  const kitchenItemId = editOfferId ? null : searchParams.get("item");
  const routeActorKind = searchParams.get("actorKind");
  const routeActorId = searchParams.get("actorId");

  // Step state (1: Donor profile, 2: Photo/AI, 3: Details & Declarations, 4: Pickup & Location, 5: Privacy Preview & Publish)
  const [step, setStep] = useState<number>(1);

  // Actor selection
  const [actors, setActors] = useState<DonorActor[]>([]);
  const [selectedActor, setSelectedActor] = useState<DonorActor | null>(null);

  // Offer Draft state
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftVersion, setDraftVersion] = useState<number>(1);
  const [editLoaded, setEditLoaded] = useState(!editOfferId);
  const [kitchenPrefill, setKitchenPrefill] = useState<{ key: string; phase: "ready" | "error"; item: KitchenObservation | null; message: string } | null>(null);

  // Photo & Analysis state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [analyzingPhoto, setAnalyzingPhoto] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<OfferAnalyzeResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Form declarations
  const [title, setTitle] = useState<string>("");
  const [category, setCategory] = useState<string>("Produce");
  const [tagsInput, setTagsInput] = useState<string>("unserved");
  const [quantity, setQuantity] = useState<number | null>(5);
  const [unit, setUnit] = useState<OfferUnit>("portion");
  const [storageCondition, setStorageCondition] = useState<"UNKNOWN" | "AMBIENT" | "CHILLED" | "FROZEN" | "OTHER">("AMBIENT");
  const [allergenDeclaration, setAllergenDeclaration] = useState<"UNKNOWN" | "DONOR_DECLARED_NONE" | "DONOR_DECLARED_PRESENT">("DONOR_DECLARED_NONE");
  const [expiryDeclaration, setExpiryDeclaration] = useState<"UNKNOWN" | "DONOR_DECLARED">("UNKNOWN");
  const [expiryAt, setExpiryAt] = useState<string>("");

  // Pickup window
  const [pickupStart, setPickupStart] = useState<string>(() => localDateTimeInput(new Date(Date.now() + 30 * 60 * 1000)));
  const [pickupEnd, setPickupEnd] = useState<string>(() => localDateTimeInput(new Date(Date.now() + 4 * 60 * 60 * 1000)));

  // Location
  const [approximateArea, setApproximateArea] = useState<string>("");
  const [exactAddress, setExactAddress] = useState<string>("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [pickupInstructions, setPickupInstructions] = useState<string>("");
  const [geoLocating, setGeoLocating] = useState<boolean>(false);
  const [geoNotice, setGeoNotice] = useState<string | null>(null);

  // Submission & Validation
  const [confirmedTruthful, setConfirmedTruthful] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const prefillKey = `${household.user?.uid ?? ""}:${household.householdId ?? ""}:${kitchenItemId ?? ""}`;
  const prefillMatches = kitchenPrefill?.key === prefillKey;
  const validKitchenItemId = kitchenItemId !== null && /^[A-Za-z0-9._:-]{1,128}$/.test(kitchenItemId);

  useEffect(() => {
    if (!validKitchenItemId || !kitchenItemId || household.auth !== "signed-in" || !household.user || !household.householdId) return;

    let active = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const token = await household.user!.getIdToken();
        const result = await readCanonicalRecords("kitchen", token, household.householdId!, controller.signal);
        if (result.kind !== "kitchen") throw new Error("The household service returned the wrong record type.");
        const item = result.records.find((record) => record.item_id === kitchenItemId);
        if (!item) throw new Error("This item is no longer in the active household Kitchen.");
        if (!active) return;
        setTitle(item.name);
        setCategory("Other");
        setTagsInput("unserved");
        setQuantity(null);
        const exactOfferUnit = new Set<OfferUnit>(["g", "ml", "portion", "package", "item"]);
        if (item.amount !== null && item.amount > 0 && Number.isInteger(item.amount) && item.unit && exactOfferUnit.has(item.unit as OfferUnit)) {
          setQuantity(item.amount);
          setUnit(item.unit as OfferUnit);
        }
        setStorageCondition("UNKNOWN");
        setAllergenDeclaration("UNKNOWN");
        setExpiryDeclaration("UNKNOWN");
        setExpiryAt("");
        setKitchenPrefill({ key: prefillKey, phase: "ready", item, message: "Prefilled from your confirmed Kitchen record. Review each value; category, storage, allergens and any donor-declared expiry still need your confirmation." });
      } catch (error) {
        if (active && !controller.signal.aborted) setKitchenPrefill({ key: prefillKey, phase: "error", item: null, message: error instanceof Error ? `${error.message} You can continue with a manual offer.` : "The Kitchen item could not be loaded. You can continue with a manual offer." });
      }
    })();
    return () => { active = false; controller.abort(); };
  }, [household.auth, household.householdId, household.user, kitchenItemId, prefillKey, validKitchenItemId]);

  // Preview tab
  const [previewTab, setPreviewTab] = useState<"public" | "post_claim">("public");

  // Load actors
  useEffect(() => {
    let active = true;
    async function loadActors() {
      if (household.auth !== "signed-in") return;
      try {
        const token = (await household.user?.getIdToken()) || "";
        const orgs = await fetchMyOrganizations(token);
        const bizOrgs = orgs.filter((o) => o.type === "business_donor");

        const actorList: DonorActor[] = [];
        if (household.householdId) {
          actorList.push({
            kind: "household",
            id: household.householdId,
            name: `My Household (${household.householdId.slice(0, 8)})`,
          });
        }
        bizOrgs.forEach((org) => {
          actorList.push({
            kind: "business",
            id: org.org_id,
            name: `${org.name} (${org.verification_status})`,
            status: org.verification_status,
          });
        });

        if (active) {
          setActors(actorList);
          setSelectedActor((prev) => prev ?? (actorList.length > 0 ? actorList[0] : null));
        }
      } catch (err: unknown) {
        console.error("Failed to load donor actors:", err);
      }
    }
    void loadActors();
    return () => { active = false; };
  }, [household.auth, household.householdId, household.user]);

  useEffect(() => {
    let active = true;
    if (!editOfferId || household.auth !== "signed-in") return;
    void (async () => {
      try {
        const token = (await household.user?.getIdToken()) || "";
        const actorKind: "household" | "business" = routeActorKind === "business" && routeActorId ? "business" : "household";
        const actorId = actorKind === "business" ? routeActorId! : household.householdId || "";
        const actor = { kind: actorKind, id: actorId };
        let actorName = "My Household";
        if (actorKind === "business") {
          const organizations = await fetchMyOrganizations(token);
          const organization = organizations.find((item) => item.type === "business_donor" && item.org_id === actorId);
          if (!organization) throw new Error("That business donor profile is not available to this account.");
          actorName = organization.name;
        }
        const offer: SurplusOffer = await fetchOffer(token, actor, editOfferId);
        if (!offer.donor || offer.donor.kind !== actorKind || offer.donor.owner_id !== actorId) throw new Error("This offering does not belong to the selected donor profile.");
        if (!active) return;
        setDraftId(offer.offer_id);
        setDraftVersion(offer.version);
        setSelectedActor({ kind: actorKind, id: actorId, name: actorName });
        setTitle(offer.title);
        setCategory(offer.category);
        setTagsInput((offer.tags || []).join(", "));
        setQuantity(offer.quantity_total_minor || 1);
        setUnit(offer.unit || "portion");
        setStorageCondition(offer.storage_declaration);
        setAllergenDeclaration(offer.allergen_declaration);
        setExpiryDeclaration(offer.expiry_declaration);
        setExpiryAt(offer.expiry_at ? localDateTimeInput(new Date(offer.expiry_at)) : "");
        setPickupStart(offer.pickup_window_start ? localDateTimeInput(new Date(offer.pickup_window_start)) : "");
        setPickupEnd(offer.pickup_window_end ? localDateTimeInput(new Date(offer.pickup_window_end)) : "");
        setApproximateArea(offer.approximate_area || "");
        setExactAddress(offer.exact_address || "");
        setLatitude(offer.latitude ?? null);
        setLongitude(offer.longitude ?? null);
        setPickupInstructions(offer.pickup_instructions || "");
        setStep(3);
        setEditLoaded(true);
      } catch (err) {
        if (active) {
          setPublishError(err instanceof Error ? err.message : "Could not load this offer for editing.");
          setEditLoaded(true);
        }
      }
    })();
    return () => { active = false; };
  }, [editOfferId, household.auth, household.householdId, household.user, routeActorKind, routeActorId]);

  // Handle Geolocation with permission check and graceful fallback
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setGeoNotice("Geolocation is not supported by your browser. Please enter the coordinates or address manually.");
      return;
    }
    setGeoLocating(true);
    setGeoNotice(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(Number(position.coords.latitude.toFixed(4)));
        setLongitude(Number(position.coords.longitude.toFixed(4)));
        setGeoNotice("Current coordinates acquired successfully.");
        setGeoLocating(false);
      },
      (error) => {
        let msg = "Location permission denied. Please enter your address and coordinates manually.";
        if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "Location information is unavailable. Please enter details manually.";
        } else if (error.code === error.TIMEOUT) {
          msg = "Location request timed out. Please enter details manually.";
        }
        setGeoNotice(msg);
        setGeoLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  // Handle Photo selection and trigger upload + Gemini analysis
  const handlePhotoSelected = async (file: File) => {
    if (file.size > 2_000_000) {
      setAiError("This image is larger than the 2 MB upload limit. Choose a smaller JPEG, PNG, or WebP image.");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setAnalyzingPhoto(true);
    setAiError(null);

    try {
      if (!selectedActor || household.auth !== "signed-in") return;
      const token = (await household.user?.getIdToken()) || "";

      // Ensure a draft exists first
      let currentDraftId = draftId;
      if (!currentDraftId) {
        const initialTitle = title.trim() || "Surplus food offer";
        const draft = await createOfferDraft(
          token,
          { kind: selectedActor.kind, id: selectedActor.id },
          initialTitle,
          category,
        );
        currentDraftId = draft.offer_id;
        setDraftId(draft.offer_id);
        setDraftVersion(draft.version);
      }

      // Upload media
      const mediaResult = await uploadOfferMedia(
        token,
        { kind: selectedActor.kind, id: selectedActor.id },
        currentDraftId,
        file,
      );
      setDraftVersion(mediaResult.version);

      // Call Gemini Analysis
      const analysis = await analyzeOfferMedia(
        token,
        { kind: selectedActor.kind, id: selectedActor.id },
        currentDraftId,
        [mediaResult.media_id],
      );
      setAiResult(analysis);

      // Auto-populate suggestions if user hasn't typed their own
      if (analysis.suggested_title && !title) {
        setTitle(analysis.suggested_title);
      }
      if (analysis.suggested_category) {
        setCategory(analysis.suggested_category);
      }
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "AI image analysis unavailable. You can complete the details manually.");
    } finally {
      setAnalyzingPhoto(false);
    }
  };

  // Save changes to draft
  const saveDraft = async (): Promise<{ offerId: string; version: number } | null> => {
    if (!selectedActor || household.auth !== "signed-in") return null;
    setFieldErrors({});
    const errors: Record<string, string> = {};
    const offerQuantity = quantity;

    if (!title.trim()) errors.title = "A descriptive food title is required.";
    if (offerQuantity === null || offerQuantity <= 0) errors.quantity = "Please specify a positive integer quantity.";
    if (!pickupStart) errors.pickupStart = "Pickup start time is required.";
    if (!pickupEnd) errors.pickupEnd = "Pickup end time is required.";
    if (new Date(pickupEnd) <= new Date(pickupStart)) {
      errors.pickupEnd = "Pickup end time must be after start time.";
    }
    if (!approximateArea.trim()) errors.approximateArea = "Approximate area is required for public discovery.";
    if (latitude === null || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) errors.latitude = "Enter a valid latitude or use current location.";
    if (longitude === null || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) errors.longitude = "Enter a valid longitude or use current location.";
    if (!exactAddress.trim() || exactAddress.trim().length < 5) {
      errors.exactAddress = "Exact pickup address is required for recipient collection.";
    }
    if (expiryDeclaration === "DONOR_DECLARED" && !expiryAt) {
      errors.expiryAt = "Expiry date and time is required when declared by donor.";
    }
    if (expiryDeclaration === "DONOR_DECLARED" && expiryAt && pickupEnd && new Date(pickupEnd) > new Date(expiryAt)) {
      errors.pickupEnd = "Pickup must end before the donor-declared expiry time.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return null;
    }
    if (offerQuantity === null) return null;

    try {
      const token = (await household.user?.getIdToken()) || "";
      let currentDraftId = draftId;
      let currentVer = draftVersion;

      if (!currentDraftId) {
        const draft = await createOfferDraft(
          token,
          { kind: selectedActor.kind, id: selectedActor.id },
          title.trim(),
          category,
        );
        currentDraftId = draft.offer_id;
        currentVer = draft.version;
        setDraftId(draft.offer_id);
        setDraftVersion(draft.version);
      }

      // Convert tags
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      // Ensure ISO string with timezone
      const startIso = new Date(pickupStart).toISOString();
      const endIso = new Date(pickupEnd).toISOString();
      const expiryIso = expiryDeclaration === "DONOR_DECLARED" && expiryAt ? new Date(expiryAt).toISOString() : null;

      const editResult = await editOffer(
        token,
        { kind: selectedActor.kind, id: selectedActor.id },
        currentDraftId,
        {
          expected_version: currentVer,
          title: title.trim(),
          category,
          tags,
          quantity_total_minor: Math.floor(offerQuantity),
          unit,
          expiry_declaration: expiryDeclaration,
          expiry_at: expiryIso,
          storage_declaration: storageCondition,
          allergen_declaration: allergenDeclaration,
          pickup_window_start: startIso,
          pickup_window_end: endIso,
          approximate_area: approximateArea.trim(),
          exact_address: exactAddress.trim(),
          latitude: latitude ?? 0,
          longitude: longitude ?? 0,
          pickup_instructions: pickupInstructions.trim(),
        },
      );

      setDraftVersion(editResult.version);
      return { offerId: currentDraftId, version: editResult.version };
    } catch (err: unknown) {
      setPublishError(err instanceof Error ? err.message : "Failed to update offering draft.");
      return null;
    }
  };

  // Publish offer
  const handlePublish = async () => {
    if (!confirmedTruthful) {
      setPublishError("Please confirm that all declarations are accurate before publishing.");
      return;
    }
    if (!selectedActor || household.auth !== "signed-in") {
      setPublishError("Your donor profile is not ready. Please reload and try again.");
      return;
    }

    setPublishing(true);
    setPublishError(null);

    try {
      const token = (await household.user?.getIdToken()) || "";
      const savedDraft = await saveDraft();
      if (!savedDraft) {
        return;
      }
      const currentDraftId = savedDraft.offerId;

      const currentOffer = editOfferId ? await fetchOffer(token, { kind: selectedActor.kind, id: selectedActor.id }, currentDraftId) : null;
      if (!currentOffer || currentOffer.status === "DRAFT") await publishOffer(
        token,
        { kind: selectedActor.kind, id: selectedActor.id },
        currentDraftId,
        savedDraft.version,
      );

      const actorQuery = new URLSearchParams({ actorKind: selectedActor.kind, actorId: selectedActor.id });
      router.push(`/offers/${encodeURIComponent(currentDraftId)}?${actorQuery.toString()}`);
    } catch (err: unknown) {
      setPublishError(err instanceof Error ? err.message : "Failed to publish offering.");
    } finally {
      setPublishing(false);
    }
  };

  if (!editLoaded) return <div className="mx-auto max-w-xl py-12 text-center text-sm text-muted">Loading offer for editing…</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      {/* Return Context */}
      <div className="flex items-center justify-between">
        <Link
          href="/offers"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-primary transition-colors py-1.5"
        >
          <Icon name="arrow" size={16} className="rotate-180" />
          <span>Back to My Offerings</span>
        </Link>
        <span className="text-xs font-bold text-secondary uppercase tracking-wider">
          Step {step} of 4
        </span>
      </div>

      {/* Title */}
      <div>
        <Heading as="h1" className="text-2xl sm:text-3xl">
          {editOfferId ? "Edit Surplus Food Offer" : "Publish Surplus Food Offer"}
        </Heading>
        <p className="mt-1 text-sm text-muted">
          Provide truthful declarations for unserved, peak-freshness surplus. Approved local non-profits and food banks will see your offer for scheduled pickup.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="grid grid-cols-4 gap-2">
        {["Profile", "Photo & AI", "Details", "Preview"].map((label, idx) => {
          const stepNumber = idx + 1;
          const isActive = step === stepNumber;
          const isDone = step > stepNumber;
          return (
            <div key={label} className="space-y-1">
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  isDone ? "bg-primary" : isActive ? "bg-secondary" : "bg-surface-raised"
                }`}
              />
              <span
                className={`block text-[11px] font-bold truncate ${
                  isActive ? "text-primary" : "text-muted"
                }`}
              >
                {stepNumber}. {label}
              </span>
            </div>
          );
        })}
      </div>

      {publishError && (
        <Card className="border border-danger/30 p-4 bg-danger-soft/30 space-y-2" role="alert">
          <p className="text-xs font-bold text-danger uppercase tracking-wider">Publication Note</p>
          <p className="text-sm font-semibold text-danger">{publishError}</p>
        </Card>
      )}

      {kitchenItemId && !validKitchenItemId && <Card className="border border-danger/30 bg-danger-soft/30 p-4 text-sm text-danger" role="alert">This Kitchen item link is invalid. You can continue with a manual offer.</Card>}
      {validKitchenItemId && !prefillMatches && <Card className="p-4 text-sm text-muted" role="status">{household.auth === "signed-in" && household.householdId ? "Loading this confirmed Kitchen item…" : "Sign in and select its household to load this Kitchen item. You can continue with a manual offer."}</Card>}
      {prefillMatches && kitchenPrefill.phase === "error" && <Card className="border border-danger/30 bg-danger-soft/30 p-4 text-sm text-danger" role="alert">{kitchenPrefill.message}</Card>}
      {prefillMatches && kitchenPrefill.phase === "ready" && kitchenPrefill.item && <Card className="space-y-2 border border-primary/20 bg-primary-soft/20 p-4">
        <div><p className="text-xs font-bold uppercase tracking-wide text-primary">Kitchen item prefill · review required</p><p className="mt-1 text-sm text-ink">{kitchenPrefill.message}</p></div>
        <dl className="grid grid-cols-2 gap-2 text-xs"><div><dt className="text-muted">Kitchen amount</dt><dd className="font-semibold text-ink">{kitchenPrefill.item.amount === null ? "Unknown" : `${kitchenPrefill.item.amount} ${kitchenPrefill.item.unit}`}</dd></div><div><dt className="text-muted">Recorded date</dt><dd className="font-semibold text-ink">{kitchenPrefill.item.date_value ? `${kitchenPrefill.item.date_type.toLowerCase().replaceAll("_", " ")} · ${kitchenPrefill.item.date_value}` : "Unknown"}</dd></div><div><dt className="text-muted">Storage note</dt><dd className="font-semibold text-ink">{kitchenPrefill.item.storage || "Unknown"}</dd></div><div><dt className="text-muted">Safety</dt><dd className="font-semibold text-ink">Not assessed</dd></div></dl>
        <p className="text-xs leading-5 text-muted">This copies household observations into an editable offer draft only. It does not assess condition or safety. Dates without a time are not converted into an expiry time.</p>
      </Card>}

      {/* STEP 1: Choose Profile */}
      {step === 1 && (
        <Card className="p-5 sm:p-6 space-y-5">
          <div className="space-y-1">
            <Heading as="h2" className="text-lg">
              1. Choose Donor Profile
            </Heading>
            <p className="text-xs text-muted">
              {kitchenItemId ? "This Kitchen item belongs to your household, so its prefilled details can only be offered by that household." : "Select whether this offering belongs to your personal household or a registered business donor profile."}
            </p>
          </div>

          <div className="space-y-3">
            {actors.map((actor) => {
              const isSelected = selectedActor?.kind === actor.kind && selectedActor?.id === actor.id;
              const isBlockedBusiness = kitchenItemId !== null && validKitchenItemId && (!prefillMatches || kitchenPrefill?.phase === "ready") && actor.kind === "business";
              return (
                <button
                  type="button"
                  key={`${actor.kind}:${actor.id}`}
                  disabled={isBlockedBusiness}
                  aria-pressed={isSelected}
                  onClick={() => { if (!isBlockedBusiness) setSelectedActor(actor); }}
                  className={`w-full text-left rounded-2xl border p-4 transition-all flex items-center justify-between ${isBlockedBusiness ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${
                    isSelected
                      ? "border-primary bg-primary-soft/40 shadow-sm"
                      : "border-line bg-white hover:bg-surface-low"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-white text-primary shadow-xs">
                      <Icon name={actor.kind === "business" ? "shop" : "home"} size={20} />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink">{actor.name}</p>
                      <p className="text-xs text-muted capitalize">
                        {actor.kind === "household" ? "Individual / Family Kitchen" : "Commercial food donor"}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary text-white">
                      <Icon name="check" size={14} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="primary"
              onClick={() => setStep(2)}
              disabled={!selectedActor || Boolean(validKitchenItemId && household.auth === "signed-in" && household.householdId && !prefillMatches)}
            >
              <span>Continue to Photo & AI</span>
              <Icon name="arrow" size={16} />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: Photo Capture & Gemini Structured Observations */}
      {step === 2 && (
        <Card className="p-5 sm:p-6 space-y-5">
          <div className="space-y-1">
            <Heading as="h2" className="text-lg">
              2. Capture or Upload Food Photo
            </Heading>
            <p className="text-xs text-muted">
              Optional but recommended: Google Vertex AI / Gemini observes visible items and packaging to accelerate your form entry.
            </p>
          </div>

          {/* Photo Dropzone / Camera */}
          <div className="space-y-3">
            {photoPreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-line bg-surface-low aspect-video max-h-64 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="Surplus food preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                    setAiResult(null);
                  }}
                  className="absolute top-3 right-3 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition-colors"
                  aria-label="Remove photo"
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-surface-low/50 p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary mb-3">
                  <Icon name="kitchen" size={26} />
                </div>
                <p className="text-sm font-bold text-ink">Take photo or browse image</p>
                <p className="mt-1 text-xs text-muted">JPEG, PNG, or WebP up to 2MB</p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handlePhotoSelected(e.target.files[0]);
                    }
                  }}
                />
              </label>
            )}
          </div>

          {/* Analysis loading state */}
          {analyzingPhoto && (
            <div className="flex items-center gap-3 rounded-xl bg-surface-raised p-4 text-xs text-primary font-semibold animate-pulse">
              <Icon name="ask" size={18} />
              <span>Analyzing photo with Gemini for packaging & visible food suggestions…</span>
            </div>
          )}

          {/* AI Observation Results */}
          {aiResult && (
            <div className="rounded-2xl border border-primary/20 bg-primary-soft/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <Icon name="ask" size={16} />
                  <span>Gemini Observations</span>
                </span>
                <Badge tone={aiResult.ai_provider ? "green" : "amber"} className="text-[10px]">
                  {aiResult.ai_provider ? "Google AI" : "Manual review needed"}
                </Badge>
              </div>

              {aiResult.uncertainty && <p role="status" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{aiResult.uncertainty}</p>}

              {aiResult.visible_food.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-muted uppercase">Visible items detected:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {aiResult.visible_food.map((item) => (
                      <span key={item} className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-primary shadow-xs">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {aiResult.packaging_observations && (
                <p className="text-xs text-muted">
                  <span className="font-bold text-ink">Packaging:</span> {aiResult.packaging_observations}
                </p>
              )}

              {/* Crucial Sensory & Safety Disclaimer */}
              <div className="rounded-xl bg-surface-card p-3 text-[11px] text-muted space-y-1">
                <p className="font-bold text-secondary flex items-center gap-1">
                  <Icon name="info" size={14} />
                  <span>Sensory check required by donor</span>
                </p>
                <p>
                  No automated model certifies food safety or freshness. Expiry remains unknown unless you declare an official package label or confirmed date.
                </p>
              </div>
            </div>
          )}

          {aiError && (
            <div className="rounded-xl border border-line bg-surface-low p-3 text-xs text-muted">
              {aiError}
            </div>
          )}

          <div className="pt-2 flex justify-between items-center">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button variant="primary" onClick={() => setStep(3)}>
              <span>{photoFile ? "Confirm & continue" : "Skip photo & enter manually"}</span>
              <Icon name="arrow" size={16} />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3: Details & Declarations */}
      {step === 3 && (
        <Card className="p-5 sm:p-6 space-y-5">
          <div className="space-y-1">
            <Heading as="h2" className="text-lg">
              3. Food Declarations & Storage
            </Heading>
            <p className="text-xs text-muted">
              Fill in the mandatory quantity, storage conditions, and allergen declarations.
            </p>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1">
                <label htmlFor="offer-title" className="text-xs font-bold text-ink">Food Title / Name *</label>
              <Input
                  id="offer-title"
                required
                placeholder="e.g. Sourdough Boules, Ripe Bananas, Cooked Biryani"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              {fieldErrors.title && <p className="text-xs text-danger font-semibold">{fieldErrors.title}</p>}
            </div>

            {/* Category & Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-ink">Category *</label>
                <select
                  className="min-h-12 w-full rounded-control border border-line bg-white px-4 text-sm font-semibold text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Produce">Produce (Fruits & Veggies)</option>
                  <option value="Bakery">Bakery & Breads</option>
                  <option value="Cooked Meals">Prepared / Cooked Meals</option>
                  <option value="Dairy & Eggs">Dairy & Eggs</option>
                  <option value="Pantry">Pantry & Dry Goods</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-ink">Tags (comma separated)</label>
                <Input
                  placeholder="e.g. vegetarian, organic, unopened"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
              </div>
            </div>

            {/* Quantity and Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-ink">Quantity Total *</label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity ?? ""}
                  onChange={(e) => setQuantity(e.target.value === "" ? null : Number(e.target.value))}
                />
                {fieldErrors.quantity && <p className="text-xs text-danger font-semibold">{fieldErrors.quantity}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-ink">Unit *</label>
                <select
                  className="min-h-12 w-full rounded-control border border-line bg-white px-4 text-sm font-semibold text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as OfferUnit)}
                >
                  <option value="portion">Portion(s)</option>
                  <option value="package">Package(s)</option>
                  <option value="item">Item(s)</option>
                  <option value="g">Grams (g)</option>
                  <option value="ml">Millilitres (ml)</option>
                </select>
              </div>
            </div>

            {/* Storage Condition */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-ink">Storage Requirement</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(["UNKNOWN", "AMBIENT", "CHILLED", "FROZEN", "OTHER"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStorageCondition(s)}
                    className={`min-h-11 rounded-control border text-xs font-bold transition-all ${
                      storageCondition === s
                        ? "border-primary bg-primary text-white"
                        : "border-line bg-white text-muted hover:bg-surface-low"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Allergen Declaration */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-ink">Allergens Declaration</label>
              <select
                className="min-h-12 w-full rounded-control border border-line bg-white px-4 text-sm font-semibold text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                value={allergenDeclaration}
                onChange={(e) =>
                  setAllergenDeclaration(
                    e.target.value as "UNKNOWN" | "DONOR_DECLARED_NONE" | "DONOR_DECLARED_PRESENT",
                  )
                }
              >
                <option value="DONOR_DECLARED_NONE">No common allergens present</option>
                <option value="DONOR_DECLARED_PRESENT">Allergens present (declared by donor)</option>
                <option value="UNKNOWN">Unknown / Not checked</option>
              </select>
            </div>

            {/* Expiry Declaration */}
            <div className="space-y-2 rounded-2xl bg-surface-low p-4">
              <label className="text-xs font-bold text-ink">Expiry / Best Before Declaration</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="expiry_dec"
                    checked={expiryDeclaration === "UNKNOWN"}
                    onChange={() => setExpiryDeclaration("UNKNOWN")}
                  />
                  <span>Unknown / Best consumed soon</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="expiry_dec"
                    checked={expiryDeclaration === "DONOR_DECLARED"}
                    onChange={() => setExpiryDeclaration("DONOR_DECLARED")}
                  />
                  <span>Donor-declared date</span>
                </label>
              </div>

              {expiryDeclaration === "DONOR_DECLARED" && (
                <div className="pt-2">
                  <Input
                    type="datetime-local"
                    value={expiryAt}
                    onChange={(e) => setExpiryAt(e.target.value)}
                  />
                  {fieldErrors.expiryAt && <p className="text-xs text-danger font-semibold mt-1">{fieldErrors.expiryAt}</p>}
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-between items-center">
            <Button variant="ghost" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button variant="primary" onClick={() => setStep(4)}>
              <span>Pickup & Location</span>
              <Icon name="arrow" size={16} />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 4: Pickup Window, Location & Privacy Preview */}
      {step === 4 && (
        <Card className="p-5 sm:p-6 space-y-6">
          <div className="space-y-1">
            <Heading as="h2" className="text-lg">
              4. Pickup Window & Protected Location
            </Heading>
            <p className="text-xs text-muted">
              Declare when recipients can collect. Your exact address is never published publicly; it is shared only with the organization after an active reservation.
            </p>
          </div>

          {/* Pickup Window */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-ink">Pickup Availability Window *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[11px] text-muted">Available from:</span>
                <Input
                  type="datetime-local"
                  value={pickupStart}
                  onChange={(e) => setPickupStart(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-muted">Available until:</span>
                <Input
                  type="datetime-local"
                  value={pickupEnd}
                  onChange={(e) => setPickupEnd(e.target.value)}
                />
                {fieldErrors.pickupEnd && <p className="text-xs text-danger font-semibold">{fieldErrors.pickupEnd}</p>}
              </div>
            </div>
          </div>

          {/* Location Details */}
          <div className="space-y-4 pt-2 border-t border-line/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink">Pickup Location Details</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRequestLocation}
                disabled={geoLocating}
              >
                <Icon name="home" size={14} />
                <span>{geoLocating ? "Locating…" : "Use current GPS"}</span>
              </Button>
            </div>

            {geoNotice && (
              <p className="text-xs text-secondary font-semibold bg-secondary-soft/50 p-2.5 rounded-control">
                {geoNotice}
              </p>
            )}

            {/* Public Approximate Area */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-ink">Approximate Area (PUBLIC) *</label>
                <Badge tone="green" className="text-[10px]">Shown on public map</Badge>
              </div>
              <Input
                required
                placeholder="e.g. Koramangala 4th Block or Indiranagar Near Metro"
                value={approximateArea}
                onChange={(e) => setApproximateArea(e.target.value)}
              />
              {fieldErrors.approximateArea && <p className="text-xs text-danger font-semibold">{fieldErrors.approximateArea}</p>}
            </div>

            {/* Coordinates */}
            <p className="text-xs leading-5 text-muted">Map coordinates are required. Enter them manually or use current GPS; permission is requested only when you choose GPS.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted" htmlFor="offer-latitude">Latitude *</label>
                <Input
                  id="offer-latitude"
                  type="number"
                  step="0.0001"
                  value={latitude ?? ""}
                  onChange={(e) => setLatitude(e.target.value === "" ? null : Number(e.target.value))}
                />
                {fieldErrors.latitude && <p className="text-xs text-danger font-semibold">{fieldErrors.latitude}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted" htmlFor="offer-longitude">Longitude *</label>
                <Input
                  id="offer-longitude"
                  type="number"
                  step="0.0001"
                  value={longitude ?? ""}
                  onChange={(e) => setLongitude(e.target.value === "" ? null : Number(e.target.value))}
                />
                {fieldErrors.longitude && <p className="text-xs text-danger font-semibold">{fieldErrors.longitude}</p>}
              </div>
            </div>

            {/* Private Exact Address */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-ink">Exact Address (PRIVATE) *</label>
                <Badge tone="amber" className="text-[10px]">Hidden until reserved</Badge>
              </div>
              <Input
                required
                placeholder="e.g. Flat 302, Green Acres Apt, 5th Cross Road"
                value={exactAddress}
                onChange={(e) => setExactAddress(e.target.value)}
              />
              {fieldErrors.exactAddress && <p className="text-xs text-danger font-semibold">{fieldErrors.exactAddress}</p>}
            </div>

            {/* Pickup Instructions */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-ink">Pickup Instructions (PRIVATE)</label>
              <Input
                placeholder="e.g. Call at gate 2 or buzz flat 302 directly"
                value={pickupInstructions}
                onChange={(e) => setPickupInstructions(e.target.value)}
              />
            </div>
          </div>

          {/* Privacy Preview Tabs */}
          <div className="space-y-3 pt-4 border-t border-line/70">
            <span className="text-xs font-bold text-muted uppercase tracking-wider block">
              Privacy Verification Preview
            </span>
            <div className="flex border-b border-line gap-2">
              <button
                type="button"
                onClick={() => setPreviewTab("public")}
                className={`pb-2 text-xs font-bold border-b-2 -mb-0.5 transition-colors ${
                  previewTab === "public" ? "border-primary text-primary" : "border-transparent text-muted"
                }`}
              >
                1. What Public & NGOs See (Pre-Claim)
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab("post_claim")}
                className={`pb-2 text-xs font-bold border-b-2 -mb-0.5 transition-colors ${
                  previewTab === "post_claim" ? "border-secondary text-secondary" : "border-transparent text-muted"
                }`}
              >
                2. What Recipient Sees (Post-Reservation)
              </button>
            </div>

            {previewTab === "public" ? (
              <div className="rounded-2xl border border-line bg-surface-low p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-bold text-ink">{title || "Untitled Offer"}</h4>
                  <Badge tone="green">OPEN</Badge>
                </div>
                <p className="text-xs text-muted">
                  {quantity} {unit} · {category} · Storage: {storageCondition}
                </p>
                <p className="text-xs font-semibold text-primary">
                  📍 General Area: {approximateArea || "Area declared by donor"}
                </p>
                <p className="text-[11px] text-muted italic">
                  Exact address, phone number, and building instructions are securely hidden from discovery.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-secondary/30 bg-secondary-soft/20 p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-bold text-ink">{title || "Untitled Offer"}</h4>
                  <Badge tone="terra">RESERVED</Badge>
                </div>
                <div className="text-xs text-ink space-y-1">
                  <p><span className="font-bold">Exact Address:</span> {exactAddress}</p>
                  <p><span className="font-bold">Instructions:</span> {pickupInstructions || "Standard door pickup"}</p>
                  <p><span className="font-bold">Coordinates:</span> {latitude ?? "Not set"}, {longitude ?? "Not set"}</p>
                </div>
              </div>
            )}
          </div>

          {/* Confirmation Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 text-xs text-ink cursor-pointer bg-surface-raised p-3.5 rounded-2xl">
              <input
                type="checkbox"
                checked={confirmedTruthful}
                onChange={(e) => setConfirmedTruthful(e.target.checked)}
                className="mt-0.5 size-4 rounded text-primary focus:ring-primary/20"
              />
              <span className="leading-snug">
                I explicitly confirm these surplus food declarations are accurate, wholesome, and ready for recipient pickup during the stated window.
              </span>
            </label>
          </div>

          <div className="pt-2 flex justify-between items-center">
            <Button variant="ghost" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button
              variant="primary"
              onClick={handlePublish}
              disabled={publishing || !confirmedTruthful}
            >
              {publishing ? editOfferId ? "Saving changes…" : "Publishing offer…" : editOfferId ? "Save changes" : "Publish offering"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
