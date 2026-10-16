"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Icon } from "@/components/ui/icon";
import { LiveDestinationNotice, useLiveRecords } from "@/components/account/live-destination";
import type { PrivateActivityEvent } from "@/lib/canonical-history";

const names: Record<PrivateActivityEvent["type"], string> = { USED: "Marked as used", STORED: "Marked as stored", DISCARDED: "Marked as discarded", HANDED_OVER: "Owner confirmed handover", COMPOSTED: "Marked as composted" };
function amountText(event: PrivateActivityEvent) {
  if (event.measurement_basis === "UNKNOWN" || event.amount === null || event.unit === null) return "Amount unknown";
  return `${event.amount} ${event.unit} · ${event.measurement_basis === "MEASURED" ? "measured" : "user-estimated"}`;
}

export default function ActivityPage() {
  const live = useLiveRecords("activity");
  const events = live.records as PrivateActivityEvent[];
  return <div className="mx-auto max-w-3xl space-y-5">
    <header><Badge tone="green" className="mb-3"><Icon name="check" size={14} className="mr-1"/>HOUSEHOLD ACTIVITY</Badge><Heading as="h1">A history of recorded outcomes</Heading><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">This view contains owner-recorded outcomes returned by the household API. It does not estimate savings or verify handovers.</p></header>
    <LiveDestinationNotice />
    <Card className="flex items-start gap-3 border border-line bg-surface-muted p-4 shadow-none"><Icon name="info" className="mt-0.5 shrink-0 text-primary"/><p className="text-sm leading-relaxed text-muted">Amounts keep their recorded basis. Unknown stays unknown. Activity entries do not prove food safety, consumption, or environmental impact.</p></Card>
    {live.phase === "loading" && <Card role="status" className="p-5 text-sm text-muted">Loading private household activity…</Card>}
    {live.phase === "error" && <Card role="alert" className="space-y-3 p-5"><p className="text-sm text-danger">{live.error}</p><Button variant="secondary" onClick={live.refresh}>Retry</Button></Card>}
    {live.phase === "idle" && <Card className="p-5 text-sm text-muted">Sign in and choose a household to load its activity. No browser demo activity is substituted.</Card>}
    {live.phase === "ready" && (events.length === 0 ? <Card className="p-5 text-center"><Heading as="h2">Nothing recorded yet</Heading><p className="mt-2 text-sm text-muted">The household API returned no owner-recorded outcomes.</p></Card> : <section aria-labelledby="events-heading"><div className="mb-3 flex items-center justify-between"><Heading id="events-heading" as="h2">Recent outcomes</Heading><Badge>{events.length} {events.length === 1 ? "entry" : "entries"}</Badge></div><ol className="space-y-3">{events.map((event) => <li key={event.event_id}><Card className="flex gap-3 p-4 sm:gap-4 sm:p-5"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary"><Icon name="leaf" size={20}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="font-bold text-primary">{names[event.type]}</p><time dateTime={event.occurred_at} className="text-xs text-muted">{new Date(event.occurred_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time></div><p className="mt-2 text-sm">{amountText(event)}</p><p className="mt-1 text-xs text-muted">Owner reported · record {event.event_id}</p></div></Card></li>)}</ol>{live.nextCursor && <Card className="mt-3 p-4 text-sm text-muted">More activity is available. Open <a href="/account" className="font-semibold text-primary underline">Account → Private activity</a> to load additional pages.</Card>}</section>)}
  </div>;
}
