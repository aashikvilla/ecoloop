"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { useLiveHousehold } from "@/lib/live-household";
import {
  cancelOffer,
  fetchOffer,
  type DonorActorKind,
  type SurplusOffer,
} from "@/lib/canonical-offers";

export function OfferDetail({ offerId }: { offerId: string }) {
  const household = useLiveHousehold();

  const [offer, setOffer] = useState<SurplusOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadDetail = async () => {
    if (household.auth !== "signed-in") return;
    setLoading(true);
    setError(null);
    try {
      const token = (await household.user?.getIdToken()) || "";
      // Try household actor first
      const actorKind: DonorActorKind = "household";
      const actorId = household.householdId || "";
      const data = await fetchOffer(token, { kind: actorKind, id: actorId }, offerId);
      setOffer(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load offer details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (household.auth !== "signed-in") return;

    void (async () => {
      try {
        const token = (await household.user?.getIdToken()) || "";
        const actorKind: DonorActorKind = "household";
        const actorId = household.householdId || "";
        const data = await fetchOffer(token, { kind: actorKind, id: actorId }, offerId);
        if (active) {
          setOffer(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load offer details.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [household.auth, household.householdId, household.user, offerId]);

  const handleCancel = async () => {
    if (!offer || household.auth !== "signed-in") return;
    setCancelling(true);
    setCancelError(null);
    try {
      const token = (await household.user?.getIdToken()) || "";
      const donorKind = offer.donor?.kind || "household";
      const ownerId = offer.donor?.owner_id || household.householdId || "";
      await cancelOffer(
        token,
        { kind: donorKind, id: ownerId },
        offer.offer_id,
        offer.version,
        cancelReason,
      );
      setShowCancelModal(false);
      await loadDetail();
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel offering.");
    } finally {
      setCancelling(false);
    }
  };

  if (household.auth === "signed-out") {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-sm text-muted">
        Please sign in to view this offering.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-sm text-muted">
        Loading offering details…
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="max-w-2xl mx-auto py-8 space-y-4">
        <Card className="border border-danger/30 p-6 space-y-3">
          <p className="text-sm font-semibold text-danger">
            {error || "Offering not found."}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={loadDetail}>
              Retry
            </Button>
            <Link
              href="/offers"
              className="inline-flex min-h-11 items-center px-4 text-xs font-bold text-muted hover:text-ink"
            >
              Back to Offerings
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const isOpen = offer.status === "OPEN";
  const isDraft = offer.status === "DRAFT";
  const isCancelled = offer.status === "CANCELLED";

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
        <Badge
          tone={
            isOpen
              ? "green"
              : isDraft
              ? "amber"
              : isCancelled
              ? "neutral"
              : "terra"
          }
        >
          {offer.status}
        </Badge>
      </div>

      {/* Main Offering Card */}
      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            {offer.category} · Donor: {offer.donor?.kind ?? "Household"}
          </span>
          <Heading as="h1" className="text-2xl sm:text-3xl">
            {offer.title}
          </Heading>
          <p className="text-xs text-muted">
            Created: {offer.created_at ? new Date(offer.created_at).toLocaleString() : "Unknown"} · Version: {offer.version}
          </p>
        </div>

        {/* Quantity Ledger Table */}
        <div className="rounded-2xl bg-surface-low p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-ink">
            Quantity Ledger (Canonical Balance)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-white p-3">
              <span className="block text-[11px] font-semibold text-muted">Total Declared</span>
              <span className="text-xl font-black text-ink">
                {offer.quantity_total_minor ?? "—"} {offer.unit}
              </span>
            </div>
            <div className="rounded-xl bg-white p-3">
              <span className="block text-[11px] font-semibold text-primary">Available</span>
              <span className="text-xl font-black text-primary">
                {offer.quantity_available_minor ?? "—"} {offer.unit}
              </span>
            </div>
            <div className="rounded-xl bg-white p-3">
              <span className="block text-[11px] font-semibold text-secondary">Reserved</span>
              <span className="text-xl font-black text-secondary">
                {offer.quantity_reserved_minor ?? 0} {offer.unit}
              </span>
            </div>
            <div className="rounded-xl bg-white p-3">
              <span className="block text-[11px] font-semibold text-muted">Collected</span>
              <span className="text-xl font-black text-muted">
                {offer.quantity_collected_minor ?? 0} {offer.unit}
              </span>
            </div>
          </div>
        </div>

        {/* Declarations Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="font-bold text-muted uppercase">Storage Requirement:</span>
            <p className="font-semibold text-ink">{offer.storage_declaration}</p>
          </div>
          <div className="space-y-1">
            <span className="font-bold text-muted uppercase">Allergens:</span>
            <p className="font-semibold text-ink">
              {offer.allergen_declaration === "DONOR_DECLARED_NONE"
                ? "None declared by donor"
                : offer.allergen_declaration === "DONOR_DECLARED_PRESENT"
                ? "Allergens present"
                : "Unknown"}
            </p>
          </div>
          <div className="space-y-1">
            <span className="font-bold text-muted uppercase">Expiry Declaration:</span>
            <p className="font-semibold text-ink">
              {offer.expiry_declaration === "DONOR_DECLARED" && offer.expiry_at
                ? `Donor declared: ${new Date(offer.expiry_at).toLocaleString()}`
                : "Unknown / Consume fresh"}
            </p>
          </div>
          <div className="space-y-1">
            <span className="font-bold text-muted uppercase">Pickup Window:</span>
            <p className="font-semibold text-ink">
              {offer.pickup_window_start && offer.pickup_window_end
                ? `${new Date(offer.pickup_window_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${new Date(offer.pickup_window_end).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}`
                : "Undeclared"}
            </p>
          </div>
        </div>

        {/* Location Details (Protected) */}
        <div className="rounded-2xl border border-line p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink uppercase tracking-wider">
              Pickup Location
            </span>
            <Badge tone="green" className="text-[10px]">
              Area Public · Address Private
            </Badge>
          </div>

          <div className="space-y-2 text-xs">
            <p>
              <span className="font-bold text-muted">Approximate Area (Public discovery):</span>{" "}
              <span className="font-semibold text-ink">{offer.approximate_area || "Declared by donor"}</span>
            </p>
            {offer.exact_address && (
              <p>
                <span className="font-bold text-muted">Exact Address (Revealed on claim):</span>{" "}
                <span className="font-semibold text-ink">{offer.exact_address}</span>
              </p>
            )}
            {offer.pickup_instructions && (
              <p>
                <span className="font-bold text-muted">Pickup Instructions:</span>{" "}
                <span className="font-semibold text-ink">{offer.pickup_instructions}</span>
              </p>
            )}
          </div>
        </div>

        {/* Media IDs */}
        {offer.media_ids && offer.media_ids.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-muted uppercase">Attached Media</span>
            <p className="text-xs text-muted">
              {offer.media_ids.length} private photo(s) stored securely in Google Cloud Storage.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-line/70 pt-4">
          <Link
            href="/offers"
            className="inline-flex min-h-11 items-center text-xs font-bold text-muted hover:text-ink"
          >
            ← Back to all offerings
          </Link>

          {(isOpen || isDraft) && <div className="flex gap-2">
            {(isDraft || isOpen && (offer.quantity_reserved_minor ?? 0) === 0 && (offer.quantity_collected_minor ?? 0) === 0) && <Link href={`/offers/${encodeURIComponent(offer.offer_id)}/edit`} className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-xs font-bold text-primary">Edit offer</Link>}
            <Button variant="danger" size="sm" onClick={() => { setShowCancelModal(true); setCancelError(null); }}>Cancel this offering</Button>
          </div>}
        </div>
      </Card>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div
          role="dialog"
          aria-labelledby="detail-cancel-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        >
          <Card className="w-full max-w-md p-6 space-y-4">
            <div className="space-y-1">
              <Heading id="detail-cancel-title" as="h3" className="text-lg text-danger">
                Cancel Offering
              </Heading>
              <p className="text-xs text-muted">
                Cancelling will immediately remove this offering from discovery and set available quantity to 0.
              </p>
            </div>

            {cancelError && (
              <p className="text-xs text-danger font-semibold bg-danger-soft p-2.5 rounded-control">
                {cancelError}
              </p>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-ink">Reason for Cancellation</label>
              <Input
                required
                placeholder="e.g. Collection plan changed"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling || cancelReason.trim().length < 2}
              >
                Keep active
              </Button>
              <Button
                variant="danger"
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? "Cancelling…" : "Confirm cancellation"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
