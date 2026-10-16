"use client";

import Link from "next/link";
import { LiveDestinationNotice, useLiveRecords } from "@/components/account/live-destination";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import type { ShoppingEntry } from "@/lib/canonical-api";

export function ShoppingList() {
  const live = useLiveRecords("shopping");
  const entries = live.records as ShoppingEntry[];
  return <div className="mx-auto max-w-4xl space-y-5 px-4 pb-12 pt-6 sm:px-6 lg:pt-10">
    <header><p className="text-xs font-bold uppercase tracking-wide text-muted">Shop</p><Heading as="h1" className="mt-1">Know what you need</Heading><p className="mt-2 text-sm leading-relaxed text-muted">Review household shopping entries returned by the API. Entries are plans only; nothing is purchased automatically.</p></header>
    <LiveDestinationNotice />
    <Card className="border border-line bg-surface-muted p-4"><p className="text-sm leading-relaxed text-muted">This destination currently reads the canonical list. Creating or editing entries is available through the reviewed account controls when the household command flag is enabled.</p><Link className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary underline" href="/account">Open account controls</Link></Card>
    {live.phase === "loading" && <Card role="status" className="p-5 text-sm text-muted">Loading household shopping list…</Card>}
    {live.phase === "error" && <Card role="alert" className="space-y-3 p-5"><p className="text-sm text-danger">{live.error}</p><Button variant="secondary" onClick={live.refresh}>Retry</Button></Card>}
    {live.phase === "idle" && <Card className="p-5 text-sm text-muted">Sign in and choose a household to view its shopping list. No browser demo entries are substituted.</Card>}
    {live.phase === "ready" && (entries.length === 0 ? <Card className="p-5"><Heading as="h2">No shopping entries</Heading><p className="mt-1 text-sm text-muted">The household API returned an empty list.</p></Card> : <section className="space-y-3" aria-label="Household shopping entries">{entries.map((entry) => <Card key={entry.entry_id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-primary">{entry.item_name}</h2><p className="mt-1 text-sm text-muted">{entry.desired_amount === null ? "Amount unknown" : `${entry.desired_amount} ${entry.unit}`}</p></div><span className="rounded-full bg-surface-muted px-3 py-1 text-xs text-muted">Version {entry.version}</span></div><p className="mt-2 text-xs text-muted">Updated {new Date(entry.updated_at).toLocaleString()}</p></Card>)}</section>)}
  </div>;
}
