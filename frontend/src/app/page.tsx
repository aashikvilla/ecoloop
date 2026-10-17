"use client";

import Link from "next/link";
import { LiveDestinationNotice, useLiveRecords } from "@/components/account/live-destination";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { useLiveMealPlans } from "@/components/account/live-meal-plans";
import { useState } from "react";
import type { KitchenObservation } from "@/lib/canonical-api";
import type { PrivateActivityEvent } from "@/lib/canonical-history";

function dateLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(year, month - 1, day));
}

export default function HomePage() {
  const live = useLiveRecords("kitchen");
  const activityLive = useLiveRecords("activity");
  const mealPlansLive = useLiveMealPlans();
  const [visiblePlanCount, setVisiblePlanCount] = useState(6);
  const items = live.records as KitchenObservation[];
  const datedItems = items.filter((item) => item.date_value !== null).sort((left, right) => (left.date_value ?? "").localeCompare(right.date_value ?? ""));
  const undatedItems = items.filter((item) => item.date_value === null);
  const events = activityLive.records as PrivateActivityEvent[];
  return <div className="space-y-5 sm:space-y-7">
    <header><p className="text-xs font-extrabold uppercase tracking-[.14em] text-muted">Your household</p><Heading as="h1" className="mt-1">A clear view of your kitchen</Heading><p className="mt-2 text-sm leading-relaxed text-muted">Home summarizes confirmed household records returned by the API. Suggestions and activity summaries appear only when their services provide them.</p></header>
    <LiveDestinationNotice />
    {live.phase === "loading" && <Card role="status" className="p-5 text-sm text-muted">Loading household kitchen…</Card>}
    {live.phase === "error" && <Card role="alert" className="space-y-3 border border-danger/30 p-5"><p className="text-sm text-danger">{live.error}</p><Button variant="secondary" onClick={live.refresh}>Retry</Button></Card>}
    {live.phase === "ready" && <>
      <Card className="space-y-2 border border-line p-5"><p className="text-xs font-bold uppercase tracking-wide text-muted">Meal suggestions</p><Heading as="h2">Ask about what to make</Heading><p className="text-sm leading-relaxed text-muted">Ask can check your confirmed kitchen records and show a suggestion when one is returned. Home does not show scripted suggestions as household guidance.</p><Link href="/ask" className="inline-flex min-h-11 items-center font-semibold text-primary underline">Open Ask</Link></Card>
      <section aria-labelledby="home-kitchen-heading" className="space-y-3"><div className="flex items-center justify-between gap-3"><Heading id="home-kitchen-heading" as="h2">Kitchen records</Heading><span className="text-sm text-muted">{items.length} returned</span></div>
        {items.length === 0 ? <Card className="p-5"><p className="font-semibold text-primary">No confirmed food records</p><p className="mt-1 text-sm text-muted">The household API returned an empty kitchen.</p><Link href="/kitchen/add" className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary underline">Add food</Link></Card> : <ul className="grid gap-3 sm:grid-cols-2">{items.slice(0, 3).map((item) => <li key={item.item_id}><Card className="h-full p-4"><p className="font-semibold text-primary">{item.name}</p><p className="mt-1 text-sm text-muted">{item.amount === null ? "Amount unknown" : `${item.amount} ${item.unit}`} · {item.date_value ? `${item.date_type.replaceAll("_", " ").toLowerCase()} ${dateLabel(item.date_value)}` : "Date unknown"}</p><p className="mt-2 text-xs text-muted">Last observed {new Date(item.observed_at).toLocaleDateString()}. A record does not assess condition or safety.</p></Card></li>)}</ul>}
        <div className="flex flex-wrap gap-x-5 gap-y-1"><Link href="/kitchen" className="inline-flex min-h-11 items-center font-semibold text-primary underline">View Kitchen</Link><Link href="/kitchen/add" className="inline-flex min-h-11 items-center font-semibold text-primary underline">Add food</Link></div>
      </section>
      <section aria-labelledby="home-review-heading" className="space-y-3"><Heading id="home-review-heading" as="h2">Review your records</Heading><div className="grid gap-3 sm:grid-cols-2">
        {datedItems.slice(0, 4).map((item) => <Card key={`date-${item.item_id}`} className="p-4"><p className="text-xs font-bold uppercase tracking-wide text-secondary">Recorded date to review</p><p className="mt-1 font-semibold text-primary">{item.name}</p><p className="mt-1 text-sm text-muted">{item.date_type.replaceAll("_", " ").toLowerCase()} · {item.date_value ? dateLabel(item.date_value) : "Date not recorded"}</p><p className="mt-2 text-sm text-muted">Review this recorded date and check the food yourself; it does not assess condition or safety.</p><Link href={`/kitchen/items/${encodeURIComponent(item.item_id)}`} className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary underline">Review record</Link></Card>)}
        {undatedItems.slice(0, 4).map((item) => <Card key={`check-${item.item_id}`} className="p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted">Last checked · no date recorded</p><p className="mt-1 font-semibold text-primary">{item.name}</p><p className="mt-1 text-sm text-muted">Last recorded {new Date(item.observed_at).toLocaleDateString()}.</p><Link href={`/kitchen/items/${encodeURIComponent(item.item_id)}`} className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary underline">Check record</Link></Card>)}
        {items.length === 0 && <Card className="p-4 text-sm text-muted">Add confirmed Kitchen records to see their recorded dates and last-check prompts here.</Card>}
      </div></section>
    </>}
      <section aria-labelledby="saved-plans-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3"><Heading id="saved-plans-heading" as="h2">Saved meal plans</Heading><Link href="/ask" className="inline-flex min-h-11 items-center font-semibold text-primary underline">Open Ask</Link></div>
        {mealPlansLive.phase === "loading" && <Card role="status" className="p-4 text-sm text-muted">Loading saved meal plans…</Card>}
        {mealPlansLive.phase === "error" && <Card role="alert" className="space-y-3 p-4"><p className="text-sm text-danger">{mealPlansLive.error}</p><Button variant="secondary" onClick={mealPlansLive.refresh}>Retry</Button></Card>}
        {mealPlansLive.phase === "ready" && (mealPlansLive.plans.length === 0 ? <Card className="p-4 text-sm text-muted">No saved meal plans were returned for this household.</Card> : <ul className="grid gap-3 sm:grid-cols-2">{mealPlansLive.plans.slice(0, visiblePlanCount).map((plan) => <li key={plan.plan_id}><Card className="h-full space-y-3 p-4"><div><p className="text-xs font-bold uppercase tracking-wide text-secondary">Saved plan · approval-time stage {plan.preparation_stage.toLowerCase().replaceAll("_", " ")}</p><h3 className="mt-1 font-semibold text-primary">{plan.title}</h3><p className="mt-1 text-sm text-muted">{plan.servings} servings · saved {new Date(plan.created_at).toLocaleDateString()}</p></div><ul className="space-y-1 border-t border-line pt-3 text-sm">{plan.ingredients.slice(0, 5).map((ingredient, index) => <li key={`${plan.plan_id}-${index}`} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1"><span>{ingredient.name}{ingredient.uncertain ? " · uncertain" : ""}{ingredient.item_id && <Link href={`/kitchen/items/${encodeURIComponent(ingredient.item_id)}`} className="ml-2 inline-flex min-h-11 items-center font-semibold text-primary underline">Review item</Link>}</span><span className="shrink-0 text-muted">{ingredient.amount === null ? "Amount unknown" : `${ingredient.amount} ${ingredient.unit ?? ""}`}<span className="block text-right text-xs">{ingredient.quantity_basis === "ASSISTANT_ESTIMATE" ? "Assistant estimate" : ingredient.quantity_basis === "MEASURED" ? "Measured" : "Basis unknown"}</span></span></li>)}</ul><p className="text-xs leading-relaxed text-muted">Saving a plan does not record that it was prepared or eaten, and does not change Kitchen stock. Use a linked confirmed item to review and record an actual item outcome.</p><Link href="/kitchen" className="inline-flex min-h-11 items-center font-semibold text-primary underline">Open Kitchen</Link></Card></li>)}</ul>)}
        {mealPlansLive.phase === "ready" && (visiblePlanCount < mealPlansLive.plans.length || mealPlansLive.nextCursor) && <Button variant="secondary" onClick={() => { if (visiblePlanCount < mealPlansLive.plans.length) setVisiblePlanCount((count) => count + 6); else { setVisiblePlanCount((count) => count + 6); mealPlansLive.loadMore(); } }} disabled={mealPlansLive.loadingMore}>{mealPlansLive.loadingMore ? "Loading…" : visiblePlanCount < mealPlansLive.plans.length ? "Show more saved plans" : "Load more saved plans"}</Button>}
        {mealPlansLive.error && mealPlansLive.phase === "ready" && <p role="alert" className="text-sm text-danger">{mealPlansLive.error}</p>}
        {mealPlansLive.phase === "idle" && mealPlansLive.auth === "signed-in" && <Card className="p-4 text-sm text-muted">Choose a household above to view its private meal plans.</Card>}
      </section>
      <Card className="border border-line bg-surface-muted p-4"><div className="flex items-center justify-between gap-2"><Heading as="h2">Recorded activity</Heading><Link className="font-semibold text-primary underline" href="/activity">Open Activity</Link></div>{activityLive.phase === "loading" && <p role="status" className="mt-2 text-sm text-muted">Loading activity…</p>}{activityLive.phase === "error" && <p role="alert" className="mt-2 text-sm text-danger">Activity could not be loaded: {activityLive.error}</p>}{activityLive.phase === "ready" && <><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-2xl bg-white p-3"><p className="text-2xl font-bold text-primary">{events.length}</p><p className="text-xs text-muted">Outcomes returned</p></div><div className="rounded-2xl bg-white p-3"><p className="text-2xl font-bold text-secondary">{events.filter((event) => event.amount !== null).length}</p><p className="text-xs text-muted">With recorded amount</p></div></div><p className="mt-3 text-xs text-muted">This is the API’s first page only; see Activity for the full paginated record.</p></>}</Card>
    {live.phase === "idle" && live.auth !== "signed-in" && <Card className="p-5 text-sm text-muted">Home is waiting for a signed-in household. No demo records are shown here.</Card>}
  </div>;
}
