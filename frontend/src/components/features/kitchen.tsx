"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { LiveDestinationNotice, useLiveRecords } from "@/components/account/live-destination";
import type { KitchenObservation } from "@/lib/canonical-api";
import type { DateType } from "@/lib/contracts";
import { Notice, PageIntro, Panel, QuietLink, UnitLabel } from "./ui";

function dateLabel(date: string | null, type: DateType) {
  if (!date || type === "UNKNOWN") return "Date unknown";
  return `${type.toLowerCase().replaceAll("_", " ")} · ${date}`;
}

export function KitchenInventory() {
  const live = useLiveRecords("kitchen");
  const items = live.records as KitchenObservation[];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const filtered = items.filter((item) => item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) && (filter === "all" || (item.amount === null || item.date_type === "UNKNOWN")));
  return <div className="mx-auto max-w-5xl px-4 pb-10 pt-6 sm:px-6 lg:pt-10">
    <PageIntro eyebrow="Kitchen" title="Know what you have" description="Review confirmed household records returned by the API. Dates and amounts stay unknown until recorded." />
    <LiveDestinationNotice />
    {live.phase === "ready" && <div className="mb-5 grid grid-cols-2 gap-3"><Panel className="p-4"><p className="text-sm text-muted">Recorded items</p><p className="mt-1 text-2xl font-semibold">{items.length}</p></Panel><Panel className="p-4"><p className="text-sm text-muted">Need a check</p><p className="mt-1 text-2xl font-semibold">{items.filter((item) => item.amount === null || item.date_type === "UNKNOWN").length}</p></Panel></div>}
    <div className="mb-5 flex flex-col gap-3 sm:flex-row"><label className="sr-only" htmlFor="kitchen-search">Search kitchen</label><Input id="kitchen-search" placeholder="Search your kitchen" value={query} onChange={(event) => setQuery(event.target.value)} /><div className="flex gap-2"><button onClick={() => setFilter("all")} aria-pressed={filter === "all"} className={`min-h-11 rounded-full px-4 text-sm font-medium ${filter === "all" ? "bg-primary text-white" : "bg-surface-muted text-primary"}`}>All items</button><button onClick={() => setFilter("unknown")} aria-pressed={filter === "unknown"} className={`min-h-11 rounded-full px-4 text-sm font-medium ${filter === "unknown" ? "bg-primary text-white" : "bg-surface-muted text-primary"}`}>Needs a check</button></div></div>
    {live.phase === "loading" && <div role="status"><Panel>Loading household kitchen…</Panel></div>}{live.phase === "error" && <div role="alert"><Panel><p className="text-sm text-danger">{live.error}</p><button className="mt-3 min-h-11 underline" onClick={live.refresh}>Retry</button></Panel></div>}{live.phase === "ready" && (filtered.length === 0 ? <Panel><h2 className="text-lg font-semibold">{items.length ? "No matching food" : "No confirmed food yet"}</h2><p className="mt-2 text-sm text-muted">{items.length ? "Try another search or clear the filter." : "The household API returned an empty kitchen."}</p></Panel> : <div className="grid gap-3 md:grid-cols-2">{filtered.map((item) => <article key={item.item_id} className="rounded-3xl border border-border bg-surface p-4 shadow-sm"><p className="text-xs font-medium uppercase tracking-wide text-muted">Household record · {item.storage ?? "Storage unknown"}</p><h2 className="mt-1 text-lg font-semibold text-foreground">{item.name}</h2><p className="mt-1 text-sm text-muted"><UnitLabel amount={item.amount} unit={item.unit} /></p><p className="mt-3 border-t border-border pt-3 text-xs text-muted">{dateLabel(item.date_value, item.date_type as DateType)} · observed {new Date(item.observed_at).toLocaleDateString()}</p><p className="mt-2 text-xs text-muted">Check the item yourself. The API record does not assess condition or safety.</p></article>)}</div>)}{live.phase === "idle" && <Panel><p className="text-sm text-muted">Sign in and choose a household to view its Kitchen. No browser demo records are substituted.</p></Panel>}
    <div className="mt-7 grid gap-3 sm:grid-cols-2"><Panel className="bg-surface-muted"><p className="text-xs font-semibold uppercase tracking-wide text-primary">A gentle reminder</p><h2 className="mt-2 text-lg font-semibold">Check, then choose</h2><p className="mt-1 text-sm leading-5 text-muted">A stored date or photo cannot tell whether food is safe to eat. Use your own observations.</p><QuietLink href="/ask">Ask about a meal</QuietLink></Panel><Panel><p className="text-xs font-semibold uppercase tracking-wide text-muted">Recorded activity</p><h2 className="mt-2 text-lg font-semibold">See what you logged</h2><p className="mt-1 text-sm text-muted">Confirmed items and outcomes stay separate from meal ideas.</p><QuietLink href="/activity">Open activity</QuietLink></Panel></div>
  </div>;
}

function UnavailableKitchenFlow({ title, details }: { title: string; details: string }) {
  return <div className="mx-auto max-w-3xl space-y-4 px-4 pb-12 pt-6 sm:px-6 lg:pt-10"><PageIntro eyebrow="Kitchen · unavailable" title={title} description={details} /><Notice tone="warn">This route no longer reads or writes synthetic browser records. Use the connected account controls for supported manual fact, outcome, shopping, and private sharing commands. Capture extraction and draft review are not connected.</Notice><Panel><h2 className="text-lg font-semibold">Continue with supported controls</h2><p className="mt-2 text-sm leading-relaxed text-muted">Account controls require a signed-in owner, an explicit household, and enabled command configuration. They confirm each change and check current versions.</p><div className="mt-4 flex flex-wrap gap-2"><QuietLink href="/account">Open Account controls</QuietLink><QuietLink href="/kitchen">Back to Kitchen</QuietLink></div></Panel></div>;
}

export function CaptureFood() { return <UnavailableKitchenFlow title="Add food" details="Photo extraction and the draft capture flow are not connected to canonical household storage." />; }
export function ReviewFood() { return <UnavailableKitchenFlow title="Review food details" details="No confirmed candidate draft is available on this route. Local demo drafts are not shown as household data." />; }
export function ItemDetail(_props: { itemId: string }) { return <UnavailableKitchenFlow title="Food record details" details="This route cannot load a canonical item detail yet. The Kitchen list contains only records returned by the household API." />; }
export function ShareItem(_props: { itemId: string }) { return <UnavailableKitchenFlow title="Private sharing controls" details="Local share records are not shown here. Use Account for the existing authenticated private sharing controls." />; }
