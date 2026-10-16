"use client";

import Link from "next/link";
import { LiveDestinationNotice, useLiveRecords } from "@/components/account/live-destination";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import type { KitchenObservation } from "@/lib/canonical-api";
import type { PrivateActivityEvent } from "@/lib/canonical-history";

export default function HomePage() {
  const live = useLiveRecords("kitchen");
  const activityLive = useLiveRecords("activity");
  const items = live.records as KitchenObservation[];
  const events = activityLive.records as PrivateActivityEvent[];
  return <div className="space-y-5 sm:space-y-7">
    <header><p className="text-xs font-extrabold uppercase tracking-[.14em] text-muted">Your household</p><Heading as="h1" className="mt-1">A clear view of your kitchen</Heading><p className="mt-2 text-sm leading-relaxed text-muted">Home summarizes confirmed household records returned by the API. Suggestions and activity summaries appear only when their services provide them.</p></header>
    <LiveDestinationNotice />
    {live.phase === "loading" && <Card role="status" className="p-5 text-sm text-muted">Loading household kitchen…</Card>}
    {live.phase === "error" && <Card role="alert" className="space-y-3 border border-danger/30 p-5"><p className="text-sm text-danger">{live.error}</p><Button variant="secondary" onClick={live.refresh}>Retry</Button></Card>}
    {live.phase === "ready" && <>
      <Card className="space-y-2 border border-line p-5"><p className="text-xs font-bold uppercase tracking-wide text-muted">Meal suggestions</p><Heading as="h2">Assistant unavailable</Heading><p className="text-sm leading-relaxed text-muted">The managed assistant is not currently available. Home does not show scripted meal suggestions as household guidance.</p><Link href="/ask" className="inline-flex min-h-11 items-center font-semibold text-primary underline">Open Ask for status</Link></Card>
      <section aria-labelledby="home-kitchen-heading" className="space-y-3"><div className="flex items-center justify-between gap-3"><Heading id="home-kitchen-heading" as="h2">Kitchen records</Heading><span className="text-sm text-muted">{items.length} returned</span></div>
        {items.length === 0 ? <Card className="p-5"><p className="font-semibold text-primary">No confirmed food records</p><p className="mt-1 text-sm text-muted">The household API returned an empty kitchen.</p></Card> : <ul className="grid gap-3 sm:grid-cols-2">{items.slice(0, 3).map((item) => <li key={item.item_id}><Card className="h-full p-4"><p className="font-semibold text-primary">{item.name}</p><p className="mt-1 text-sm text-muted">{item.amount === null ? "Amount unknown" : `${item.amount} ${item.unit}`} · {item.date_value ? `${item.date_type.replaceAll("_", " ").toLowerCase()} ${item.date_value}` : "Date unknown"}</p><p className="mt-2 text-xs text-muted">Last observed {new Date(item.observed_at).toLocaleDateString()}. A record does not assess condition or safety.</p></Card></li>)}</ul>}
        <Link href="/kitchen" className="inline-flex min-h-11 items-center font-semibold text-primary underline">View Kitchen</Link>
      </section>
      <Card className="border border-line bg-surface-muted p-4"><div className="flex items-center justify-between gap-2"><Heading as="h2">Recorded activity</Heading><Link className="font-semibold text-primary underline" href="/activity">Open Activity</Link></div>{activityLive.phase === "loading" && <p role="status" className="mt-2 text-sm text-muted">Loading activity…</p>}{activityLive.phase === "error" && <p role="alert" className="mt-2 text-sm text-danger">Activity could not be loaded: {activityLive.error}</p>}{activityLive.phase === "ready" && <><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-2xl bg-white p-3"><p className="text-2xl font-bold text-primary">{events.length}</p><p className="text-xs text-muted">Outcomes returned</p></div><div className="rounded-2xl bg-white p-3"><p className="text-2xl font-bold text-secondary">{events.filter((event) => event.amount !== null).length}</p><p className="text-xs text-muted">With recorded amount</p></div></div><p className="mt-3 text-xs text-muted">This is the API’s first page only; see Activity for the full paginated record.</p></>}</Card>
    </>}
    {live.phase === "idle" && live.auth !== "signed-in" && <Card className="p-5 text-sm text-muted">Home is waiting for a signed-in household. No demo records are shown here.</Card>}
  </div>;
}
