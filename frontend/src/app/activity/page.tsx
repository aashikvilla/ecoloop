"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Icon } from "@/components/ui/icon";
import { useDemo } from "@/lib/demo-store";
import type { ActivityEvent } from "@/lib/contracts";

const eventNames: Record<ActivityEvent["type"], string> = {
  used: "Marked as used", stored: "Marked as stored", shared: "Marked as shared", discarded: "Marked as discarded", confirmed: "Food confirmed", planned: "Plan updated",
};
const basisNames: Record<ActivityEvent["measurementBasis"], string> = {
  user_estimated: "User-estimated amount", measured: "Measured amount", unknown: "Amount unknown",
};

function amountDescription(event: ActivityEvent) {
  if (event.measurementBasis === "unknown" || event.amount === null || event.unit === null) return "Amount unknown";
  return `${event.amount} ${event.unit} · ${basisNames[event.measurementBasis]}`;
}

export default function ActivityPage() {
  const { activities, hydrated } = useDemo();
  if (!hydrated) return <div role="status" aria-label="Loading activity" className="h-52 animate-pulse rounded-card bg-surface-muted"/>;

  return <div className="mx-auto max-w-3xl space-y-6">
    <header><Badge tone="green" className="mb-3"><Icon name="check" size={14} className="mr-1"/>YOUR RECORDED ACTIVITY</Badge><Heading as="h1">A history of your kitchen notes</Heading><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">This page reflects actions recorded in this browser demo. A plan is not a meal, and an item marked shared is your own note.</p></header>
    <Card className="flex items-start gap-3 border border-line bg-surface-muted p-4 shadow-none"><Icon name="info" className="mt-0.5 shrink-0 text-primary"/><p className="text-sm leading-relaxed text-muted">Amounts keep the basis you entered. Unknown stays unknown. This demo does not calculate food saved, environmental impact, or verified handovers.</p></Card>
    {activities.length === 0 ? <Card className="px-5 py-12 text-center"><span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary"><Icon name="clock" size={25}/></span><Heading as="h2" className="mt-4">Nothing recorded yet</Heading><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">When you confirm food, update a plan, or record what happened, the note will appear here.</p></Card> : <section aria-labelledby="events-heading"><div className="mb-3 flex items-center justify-between"><Heading id="events-heading" as="h2">Recent notes</Heading><Badge>{activities.length} {activities.length === 1 ? "entry" : "entries"}</Badge></div><ol className="space-y-3">
      {activities.map((event) => <li key={event.id}><Card className="flex gap-3 p-4 sm:gap-4 sm:p-5"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary"><Icon name={event.type === "planned" ? "ask" : event.type === "confirmed" ? "check" : "leaf"} size={20}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="font-bold text-primary">{eventNames[event.type]}</p><time dateTime={event.occurredAt} className="text-xs text-muted">{new Date(event.occurredAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time></div><p className="mt-1 truncate text-sm text-foreground">{event.itemName}</p><div className="mt-2 flex flex-wrap gap-2"><Badge tone={event.measurementBasis === "unknown" ? "neutral" : "green"}>{amountDescription(event)}</Badge>{event.note && <span className="self-center text-xs text-muted">{event.note}</span>}</div></div></Card></li>)}
    </ol></section>}
  </div>;
}
