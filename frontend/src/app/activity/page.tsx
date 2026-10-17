"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Icon } from "@/components/ui/icon";
import { LiveDestinationNotice, useLiveRecords } from "@/components/account/live-destination";
import type { PrivateActivityEvent, PrivateShareLog } from "@/lib/canonical-history";

const names: Record<PrivateActivityEvent["type"], string> = { USED: "Marked as used", STORED: "Marked as stored", DISCARDED: "Marked as discarded", HANDED_OVER: "Owner reported handover", COMPOSTED: "Marked as composted" };
const outcomeGroups: { type: PrivateActivityEvent["type"]; title: string }[] = [
  { type: "USED", title: "Used" },
  { type: "STORED", title: "Stored" },
  { type: "HANDED_OVER", title: "Shared · handover reported" },
  { type: "DISCARDED", title: "Discarded" },
  { type: "COMPOSTED", title: "Composted" },
];

function amountText(event: PrivateActivityEvent) {
  if (event.measurement_basis === "UNKNOWN" || event.amount === null || event.unit === null) return "Amount unknown";
  return `${event.amount} ${event.unit} · ${event.measurement_basis === "MEASURED" ? "measured" : "user-estimated"}`;
}

function measuredTotals(events: PrivateActivityEvent[], type: PrivateActivityEvent["type"]) {
  const totals = new Map<string, number>();
  let estimated = 0;
  let unknown = 0;
  for (const event of events) {
    if (event.type !== type) continue;
    if (event.measurement_basis === "MEASURED" && event.amount !== null && event.unit !== null) {
      totals.set(event.unit, (totals.get(event.unit) ?? 0) + event.amount);
    } else if (event.measurement_basis === "USER_ESTIMATED") {
      estimated += 1;
    } else {
      unknown += 1;
    }
  }
  return { totals: [...totals.entries()], estimated, unknown };
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Time unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function ActivityPage() {
  const live = useLiveRecords("activity");
  const sharing = useLiveRecords("share-logs");
  const events = live.records as PrivateActivityEvent[];
  const shareLogs = sharing.records as PrivateShareLog[];
  const isLoading = live.phase === "loading" || sharing.phase === "loading";
  const error = live.phase === "error" ? live.error : sharing.phase === "error" ? sharing.error : "";
  const isIdle = live.phase === "idle" || sharing.phase === "idle";

  return <div className="mx-auto max-w-3xl space-y-5">
    <header><Badge tone="green" className="mb-3"><Icon name="check" size={14} className="mr-1"/>HOUSEHOLD ACTIVITY</Badge><Heading as="h1">Recorded household activity</Heading><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">A factual summary of owner-recorded outcomes and private share offers. It reports actions logged by the household; it does not estimate waste prevented or environmental savings.</p></header>
    <LiveDestinationNotice />
    <Card className="flex items-start gap-3 border border-line bg-surface-muted p-4 shadow-none"><Icon name="info" className="mt-0.5 shrink-0 text-primary"/><p className="text-sm leading-relaxed text-muted">Only measured amounts in the same recorded unit are added. User-estimated and unknown amounts stay out of totals and are counted separately. “Used” and handover are owner-reported records; they do not verify consumption or a recipient’s receipt.</p></Card>
    {isLoading && <Card role="status" className="p-5 text-sm text-muted">Loading private household activity and share records…</Card>}
    {error && <Card role="alert" className="space-y-3 p-5"><p className="text-sm text-danger">{error}</p><Button variant="secondary" onClick={() => { live.refresh(); sharing.refresh(); }}>Retry</Button></Card>}
    {isIdle && !isLoading && <Card className="p-5 text-sm text-muted">Sign in and choose a household to load its activity. No browser demo records are substituted.</Card>}
    {!isLoading && !error && !isIdle && live.phase === "ready" && sharing.phase === "ready" && <>
      <section aria-labelledby="summary-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2"><div><Heading id="summary-heading" as="h2">Recorded outcomes</Heading><p className="mt-1 text-xs text-muted">Summary of the loaded outcome records</p></div><Badge>{events.length} {events.length === 1 ? "record" : "records"}</Badge></div>
        {events.length === 0 ? <Card className="p-5 text-sm text-muted">No recorded outcomes were returned.</Card> : <div className="grid gap-3 sm:grid-cols-2">
          {outcomeGroups.map(({ type, title }) => {
            const count = events.filter((event) => event.type === type).length;
            const summary = measuredTotals(events, type);
            return <Card key={type} className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
              <p className="mt-1 text-2xl font-bold text-primary">{count}</p>
              <p className="text-xs text-muted">{count === 1 ? "record" : "records"}</p>
              <p className="mt-3 border-t border-line pt-3 text-sm font-semibold">{summary.totals.length ? summary.totals.map(([unit, amount]) => `${amount} ${unit}`).join(" · ") : "No measured amount"}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{summary.estimated} user-estimated · {summary.unknown} unknown · excluded from totals</p>
            </Card>;
          })}
        </div>}
      </section>

      <section aria-labelledby="sharing-heading" className="space-y-3">
        <div><Heading id="sharing-heading" as="h2">Private share offers</Heading><p className="mt-1 text-xs text-muted">Current owner-reported status; an offer is not a handover.</p></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted">Offered</p><p className="mt-1 text-2xl font-bold text-primary">{shareLogs.filter((share) => share.state === "OFFERED").length}</p><p className="text-xs text-muted">Not yet accepted</p></Card>
          <Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted">Accepted</p><p className="mt-1 text-2xl font-bold text-primary">{shareLogs.filter((share) => share.state === "ACCEPTED").length}</p><p className="text-xs text-muted">Handover not recorded</p></Card>
          <Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted">Closed without handover</p><p className="mt-1 text-2xl font-bold text-primary">{shareLogs.filter((share) => share.state === "CANCELLED" || share.state === "EXPIRED").length}</p><p className="text-xs text-muted">Cancelled or expired offers</p></Card>
        </div>
      </section>

      <section aria-labelledby="events-heading"><div className="mb-3 flex items-center justify-between"><Heading id="events-heading" as="h2">Recent outcomes</Heading><Badge>{events.length} {events.length === 1 ? "entry" : "entries"}</Badge></div>{events.length === 0 ? <Card className="p-5 text-center text-sm text-muted">No outcomes in the loaded records.</Card> : <ol className="space-y-3">{events.map((event) => <li key={event.event_id}><Card className="flex gap-3 p-4 sm:gap-4 sm:p-5"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary"><Icon name="leaf" size={20}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="font-bold text-primary">{names[event.type]}</p><time dateTime={event.occurred_at} className="text-xs text-muted">{formatDate(event.occurred_at)}</time></div><p className="mt-2 text-sm">{amountText(event)}</p>{event.plan_id && <p className="mt-1 break-all text-xs text-muted">Saved plan reference · {event.plan_id}</p>}<p className="mt-1 text-xs text-muted">Owner reported · record {event.event_id}</p></div></Card></li>)}</ol>}{live.nextCursor && <Card className="mt-3 p-4 text-sm text-muted">More outcomes are available. Open <a href="/account" className="font-semibold text-primary underline">Account → Private activity</a> to load additional pages.</Card>}{sharing.nextCursor && <Card className="mt-3 p-4 text-sm text-muted">More share records are available in <a href="/account" className="font-semibold text-primary underline">Account → Private sharing history</a>.</Card>}</section>
    </>}
  </div>;
}
