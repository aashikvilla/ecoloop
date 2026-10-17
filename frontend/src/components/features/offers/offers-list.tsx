"use client";

import { useEffect, useState, useCallback } from "react";
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
  createBusinessOrganization,
  fetchMyOffers,
  fetchMyOrganizations,
  type DonorActor,
  type SurplusOffer,
} from "@/lib/canonical-offers";

export function OffersList() {
  const household = useLiveHousehold();

  // Actor selection: Household or Business Organization
  const [actors, setActors] = useState<DonorActor[]>([]);
  const [selectedActor, setSelectedActor] = useState<DonorActor | null>(null);

  // Offers state
  const [offers, setOffers] = useState<SurplusOffer[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "draft" | "cancelled">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Business Org Creation Modal
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgCategory, setNewOrgCategory] = useState("Bakery");
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);

  // Cancellation Modal
  const [cancelModalOffer, setCancelModalOffer] = useState<SurplusOffer | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Initialize actors list (Household + User's Business Organizations)
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

  // Load offers for selected actor
  const refreshOffers = useCallback(async () => {
    if (!selectedActor || household.auth !== "signed-in") return;
    setLoading(true);
    setError(null);
    try {
      const token = (await household.user?.getIdToken()) || "";
      const list = await fetchMyOffers(token, {
        kind: selectedActor.kind,
        id: selectedActor.id,
      });
      setOffers(list);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load offers from server.");
    } finally {
      setLoading(false);
    }
  }, [selectedActor, household.auth, household.user]);

  useEffect(() => {
    let active = true;
    if (!selectedActor || household.auth !== "signed-in") return;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const token = (await household.user?.getIdToken()) || "";
        const list = await fetchMyOffers(token, {
          kind: selectedActor!.kind,
          id: selectedActor!.id,
        });
        if (active) setOffers(list);
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load offers from server.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void run();
    return () => { active = false; };
  }, [selectedActor, household.auth, household.user]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setCreatingOrg(true);
    setOrgError(null);
    try {
      const token = (await household.user?.getIdToken()) || "";
      const created = await createBusinessOrganization(token, newOrgName.trim(), newOrgCategory);
      const newActor: DonorActor = {
        kind: "business",
        id: created.org_id,
        name: `${created.name} (PENDING)`,
        status: "PENDING",
      };
      setActors((prev) => [...prev, newActor]);
      setSelectedActor(newActor);
      setShowOrgModal(false);
      setNewOrgName("");
    } catch (err: unknown) {
      setOrgError(err instanceof Error ? err.message : "Failed to create business organization.");
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalOffer || !selectedActor) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const token = (await household.user?.getIdToken()) || "";
      await cancelOffer(
        token,
        { kind: selectedActor.kind, id: selectedActor.id },
        cancelModalOffer.offer_id,
        cancelModalOffer.version,
        cancelReason,
      );
      setCancelModalOffer(null);
      await refreshOffers();
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel offer.");
    } finally {
      setCancelling(false);
    }
  };

  // Metrics
  const totalOffered = offers.reduce((acc, o) => acc + (o.quantity_total_minor || 0), 0);
  const totalAvailable = offers.reduce((acc, o) => acc + (o.quantity_available_minor || 0), 0);

  // Filtered list
  const filteredOffers = offers.filter((o) => {
    if (filter === "active") return o.status === "OPEN" || o.status === "PARTIALLY_RESERVED";
    if (filter === "draft") return o.status === "DRAFT";
    if (filter === "cancelled") return o.status === "CANCELLED" || o.status === "CLOSED" || o.status === "EXPIRED";
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Empathy Title */}
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-secondary">
              Surplus Redistribution · Phase 1
            </p>
            <Heading as="h1" className="mt-1">
              My Surplus Food Offerings
            </Heading>
          </div>
          <Link
            href="/offers/new"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-white shadow-sm transition hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <Icon name="add" size={18} />
            <span>Create offering</span>
          </Link>
        </div>
        <p className="text-sm leading-relaxed text-muted">
          Publish surplus household and business food for approved non-profit recipients to collect. Exact addresses and instructions remain protected until an authorized organization reserves an item.
        </p>
      </header>

      {/* Actor Switcher (Household vs Business Profile) */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <label htmlFor="actor-select" className="text-xs font-bold uppercase tracking-wider text-muted">
              Active Donor Profile
            </label>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Icon name={selectedActor?.kind === "business" ? "shop" : "home"} size={16} />
              </span>
              <select
                id="actor-select"
                aria-label="Select active donor profile"
                className="min-h-11 rounded-control border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                value={selectedActor ? `${selectedActor.kind}:${selectedActor.id}` : ""}
                onChange={(e) => {
                  const [kind, id] = e.target.value.split(":");
                  const found = actors.find((a) => a.kind === kind && a.id === id);
                  if (found) setSelectedActor(found);
                }}
              >
                {actors.map((actor) => (
                  <option key={`${actor.kind}:${actor.id}`} value={`${actor.kind}:${actor.id}`}>
                    {actor.kind === "household" ? "🏡 Household: " : "🏢 Business: "} {actor.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowOrgModal(true)}
            className="self-start sm:self-center"
          >
            <span>+ Add business profile</span>
          </Button>
        </div>
      </Card>

      {/* Honest Metrics Card (Offered vs Available, strictly NO fabricated rescued claim) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Total Food Offered</p>
          <p className="mt-1 text-2xl font-black text-primary sm:text-3xl">{totalOffered}</p>
          <p className="mt-1 text-xs text-muted">Units catalogued across {offers.length} postings</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-secondary">Currently Available</p>
          <p className="mt-1 text-2xl font-black text-secondary sm:text-3xl">{totalAvailable}</p>
          <p className="mt-1 text-xs text-muted">Awaiting approved recipient reservation</p>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-line gap-2 overflow-x-auto pb-1">
        {(["all", "active", "draft", "cancelled"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`min-h-11 px-4 text-xs font-bold capitalize transition-colors border-b-2 -mb-1 ${
              filter === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {tab} {tab === "all" ? `(${offers.length})` : ""}
          </button>
        ))}
      </div>

      {/* Offerings List / Loading / Empty State */}
      {loading && (
        <Card className="p-8 text-center text-sm text-muted">
          Loading surplus food offerings…
        </Card>
      )}

      {error && (
        <Card className="border border-danger/30 p-5 space-y-3">
          <p className="text-sm font-semibold text-danger">{error}</p>
          <Button variant="secondary" size="sm" onClick={refreshOffers}>
            Retry
          </Button>
        </Card>
      )}

      {!loading && !error && filteredOffers.length === 0 && (
        <Card className="p-10 text-center space-y-4">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Icon name="leaf" size={26} />
          </div>
          <div className="space-y-1">
            <Heading as="h3" className="text-lg">No surplus offerings yet</Heading>
            <p className="text-xs sm:text-sm text-muted max-w-md mx-auto">
              Prevent food waste by sharing wholesome, unserved, or surplus items with local community kitchens and food banks.
            </p>
          </div>
          <Link
            href="/offers/new"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-white shadow-sm hover:bg-primary-container"
          >
            Create first offering
          </Link>
        </Card>
      )}

      {!loading && !error && filteredOffers.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredOffers.map((offer) => {
            const isDraft = offer.status === "DRAFT";
            const isOpen = offer.status === "OPEN";
            const isCancelled = offer.status === "CANCELLED";

            return (
              <Card key={offer.offer_id} className="p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                      {offer.category}
                    </span>
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

                  <div>
                    <h3 className="text-base font-bold text-ink hover:text-primary transition-colors">
                      <Link href={`/offers/${encodeURIComponent(offer.offer_id)}`}>
                        {offer.title}
                      </Link>
                    </h3>
                    <p className="mt-0.5 text-xs text-muted">
                      {offer.quantity_total_minor
                        ? `${offer.quantity_available_minor ?? offer.quantity_total_minor} of ${offer.quantity_total_minor} ${offer.unit ?? "units"} available`
                        : "Draft quantity undeclared"}
                    </p>
                  </div>

                  {offer.approximate_area && (
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <Icon name="home" size={14} className="shrink-0 text-secondary" />
                      <span className="truncate">{offer.approximate_area}</span>
                    </div>
                  )}

                  {offer.pickup_window_end && (
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <Icon name="clock" size={14} className="shrink-0 text-primary" />
                      <span>
                        Available until: {new Date(offer.pickup_window_end).toLocaleDateString()} {new Date(offer.pickup_window_end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}

                  {offer.tags && offer.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {offer.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-muted"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-line/70 pt-3">
                  <Link
                    href={`/offers/${encodeURIComponent(offer.offer_id)}`}
                    className="inline-flex min-h-11 items-center text-xs font-bold text-primary underline"
                  >
                    View details
                  </Link>

                  {(isOpen || isDraft) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCancelModalOffer(offer);
                        setCancelError(null);
                      }}
                      className="text-danger hover:bg-danger-soft hover:text-danger"
                    >
                      Cancel offer
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Business Donor Registration Modal */}
      {showOrgModal && (
        <div
          role="dialog"
          aria-labelledby="modal-biz-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        >
          <Card className="w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <Heading id="modal-biz-title" as="h3" className="text-lg">
                  Register Business Donor
                </Heading>
                <p className="text-xs text-muted mt-1">
                  Restaurants, bakeries, caterers, and grocery stores can publish surplus under an organization identity.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOrgModal(false)}
                className="text-muted hover:text-ink text-sm p-1"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {orgError && (
              <p className="text-xs text-danger font-semibold bg-danger-soft p-2.5 rounded-control">
                {orgError}
              </p>
            )}

            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-ink">Business Name</label>
                <Input
                  required
                  placeholder="e.g. Artisan Sourdough Bakery"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-ink">Category</label>
                <select
                  className="min-h-12 w-full rounded-control border border-line bg-white px-4 text-sm font-semibold text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                  value={newOrgCategory}
                  onChange={(e) => setNewOrgCategory(e.target.value)}
                >
                  <option value="Bakery">Bakery</option>
                  <option value="Restaurant">Restaurant / Cafe</option>
                  <option value="Grocery">Grocery / Supermarket</option>
                  <option value="Catering">Event Catering</option>
                  <option value="Other">Other Food Business</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setShowOrgModal(false)}
                  disabled={creatingOrg}
                >
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={creatingOrg}>
                  {creatingOrg ? "Registering…" : "Register profile"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModalOffer && (
        <div
          role="dialog"
          aria-labelledby="modal-cancel-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        >
          <Card className="w-full max-w-md p-6 space-y-4">
            <div className="space-y-1">
              <Heading id="modal-cancel-title" as="h3" className="text-lg text-danger">
                Cancel Offering
              </Heading>
              <p className="text-xs text-muted">
                Cancelling “{cancelModalOffer.title}” will immediately remove it from public recipient discovery and release uncollected reservations.
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
                onClick={() => setCancelModalOffer(null)}
                disabled={cancelling || cancelReason.trim().length < 2}
              >
                Keep active
              </Button>
              <Button
                variant="danger"
                type="button"
                onClick={handleConfirmCancel}
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
