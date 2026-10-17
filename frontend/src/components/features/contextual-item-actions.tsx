"use client";

import { useCallback } from "react";
import { OutcomeControls } from "@/components/account/outcome-controls";
import { ShareControls } from "@/components/account/share-controls";
import { LiveDestinationNotice, useLiveRecords } from "@/components/account/live-destination";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { useLiveHousehold } from "@/lib/live-household";
import type { KitchenObservation } from "@/lib/canonical-api";
import { PageIntro, QuietLink } from "./ui";

function useItemContext(itemId?: string) {
  const household = useLiveHousehold();
  const live = useLiveRecords("kitchen");
  const item = (live.records as KitchenObservation[]).find((record) => record.item_id === itemId);
  const getIdToken = useCallback(async () => {
    if (!household.user) throw new Error("Sign in to continue.");
    return household.user.getIdToken();
  }, [household.user]);
  const onCommitted = useCallback(() => live.refresh(), [live]);
  return { household, live, item, getIdToken, onCommitted, enabled: process.env.NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS === "true" };
}

function ItemContextSummary({ live, item }: { live: ReturnType<typeof useLiveRecords>; item: KitchenObservation | undefined }) {
  return <>
    {live.phase === "loading" && <Card role="status" className="p-4 text-sm text-muted">Loading the current Kitchen item…</Card>}
    {live.phase === "error" && <Card role="alert" className="space-y-2 p-4"><p className="text-sm text-danger">{live.error}</p><button type="button" onClick={live.refresh} className="min-h-11 rounded-full px-3 font-semibold text-primary underline">Retry Kitchen read</button></Card>}
    {live.phase === "idle" && <Card role="status" className="p-4 text-sm text-muted">Sign in and choose a household to load this item. No local or sample record is substituted.</Card>}
    {live.phase === "ready" && !item && <Card role="status" className="space-y-2 p-4"><Heading as="h2">Item unavailable</Heading><p className="text-sm leading-relaxed text-muted">This item ID was not present in the latest Kitchen response. Reload Kitchen or check the selected household before preparing an action.</p><QuietLink href="/kitchen">Return to Kitchen</QuietLink></Card>}
    {live.phase === "ready" && item && <Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Latest confirmed record · version {item.version}</p><p className="mt-1 text-sm text-muted">{item.name} · {item.amount === null || item.unit === null ? "amount unknown" : `${item.amount} ${item.unit}`} · last observed {new Date(item.observed_at).toLocaleString()}</p><p className="mt-2 text-xs leading-relaxed text-muted">Check the food yourself. This record does not assess condition or safety.</p></Card>}
  </>;
}

export function OutcomeItem({ itemId, planId, planTitle }: { itemId?: string; planId?: string; planTitle?: string }) {
  const { household, live, item, getIdToken, onCommitted, enabled } = useItemContext(itemId);
  const scopeKey = `${household.user?.uid ?? household.auth}:${household.householdId}:${itemId ?? "select-item"}:${planId ?? "no-plan"}`;
  const ready = household.auth === "signed-in" && household.user !== null && Boolean(household.householdId) && live.phase === "ready" && (!itemId || item !== undefined);
  return <div className="mx-auto max-w-3xl space-y-5 px-4 pb-12 pt-6 sm:px-6 lg:pt-10">
    <PageIntro eyebrow="Kitchen · observed outcome" title={item ? `What happened to ${item.name}?` : "Record what happened"} description="Record an outcome you personally observed. Kitchen quantity changes only from the explicit outcome amount, compatible units, and current version." />
    <LiveDestinationNotice />
    {itemId ? <QuietLink href={`/kitchen/items/${encodeURIComponent(itemId)}`}>Back to item details</QuietLink> : <QuietLink href="/">Back to Home</QuietLink>}
    {itemId && <ItemContextSummary live={live} item={item} />}
    {ready && <div key={scopeKey}><OutcomeControls getIdToken={getIdToken} householdId={household.householdId} enabled={enabled} onCommitted={onCommitted} initialItemId={itemId} planId={planId} planTitle={planTitle} /></div>}
  </div>;
}

export function ShareItem({ itemId }: { itemId: string }) {
  const { household, live, item, getIdToken, onCommitted, enabled } = useItemContext(itemId);
  const scopeKey = `${household.user?.uid ?? household.auth}:${household.householdId}:${itemId}`;
  const ready = household.auth === "signed-in" && household.user !== null && Boolean(household.householdId) && live.phase === "ready" && item !== undefined;
  return <div className="mx-auto max-w-3xl space-y-5 px-4 pb-12 pt-6 sm:px-6 lg:pt-10">
    <PageIntro eyebrow="Kitchen · private sharing" title={item ? `Share ${item.name}` : "Share before waste"} description="Prepare a private owner-reported offer and record its later status. This does not contact a recipient or arrange a handover." />
    <LiveDestinationNotice />
    <QuietLink href={`/kitchen/items/${encodeURIComponent(itemId)}`}>Back to item details</QuietLink>
    <ItemContextSummary live={live} item={item} />
    {ready && household.user && <div key={scopeKey}><ShareControls getIdToken={getIdToken} householdId={household.householdId} ownerUid={household.user.uid} enabled={enabled} onCommitted={onCommitted} initialItemId={itemId} /></div>}
  </div>;
}
