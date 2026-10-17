"use client";

import { useState } from "react";
import Link from "next/link";
import { LiveDestinationNotice, useLiveRecords } from "@/components/account/live-destination";
import { CanonicalCommandControls } from "@/components/account/command-controls";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import type { ShoppingEntry } from "@/lib/canonical-api";
import { useLiveHousehold } from "@/lib/live-household";

export function ShoppingList() {
  const live = useLiveRecords("shopping");
  const entries = live.records as ShoppingEntry[];
  const household = useLiveHousehold();
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const enabled = process.env.NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS === "true";
  const canEdit = household.auth === "signed-in" && household.user !== null && Boolean(household.householdId);

  return <div className="mx-auto max-w-4xl space-y-5 px-4 pb-12 pt-6 sm:px-6 lg:pt-10">
    <header><p className="text-xs font-bold uppercase tracking-wide text-muted">Shop</p><Heading as="h1" className="mt-1">Know what you need</Heading><p className="mt-2 text-sm leading-relaxed text-muted">Review and maintain the household shopping list. Entries are plans only; nothing is purchased automatically or counted as Kitchen stock.</p></header>
    <LiveDestinationNotice />
    <div className="flex flex-wrap gap-2"><Button onClick={() => setEditingEntryId("")} disabled={!canEdit}>Add to list</Button>{editingEntryId !== null && <Button variant="secondary" onClick={() => setEditingEntryId(null)}>Close editor</Button>}</div>
    {live.phase === "loading" && <Card role="status" className="p-5 text-sm text-muted">Loading household shopping list…</Card>}
    {live.phase === "error" && <Card role="alert" className="space-y-3 p-5"><p className="text-sm text-danger">{live.error}</p><Button variant="secondary" onClick={live.refresh}>Retry</Button></Card>}
    {live.phase === "idle" && <Card className="p-5 text-sm text-muted">Sign in and choose a household to view its shopping list. No browser demo entries are substituted.</Card>}
    {live.phase === "ready" && (entries.length === 0 ? <Card className="p-5"><Heading as="h2">No shopping entries</Heading><p className="mt-1 text-sm text-muted">The household API returned an empty list.</p></Card> : <section className="space-y-3" aria-label="Household shopping entries">{entries.map((entry) => <Card key={entry.entry_id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-primary">{entry.item_name}</h2><p className="mt-1 text-sm text-muted">{entry.desired_amount === null ? "Amount unknown" : `${entry.desired_amount} ${entry.unit}`}</p><p className="mt-2 text-xs text-muted">Updated {new Date(entry.updated_at).toLocaleString()} · version {entry.version}</p></div><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={!canEdit} onClick={() => setEditingEntryId(entry.entry_id)} aria-label={`Edit ${entry.item_name}`}>Edit</Button><Button variant="danger" size="sm" disabled={!canEdit} onClick={() => setEditingEntryId(entry.entry_id)} aria-label={`Remove ${entry.item_name} from list`}>Remove</Button></div></div></Card>)}</section>)}

    {editingEntryId !== null && <section id="shop-inline-actions" aria-label="Shopping list editor" className="scroll-mt-24">
      <Card className="space-y-3 border border-primary/20 p-4 sm:p-5">
        <Heading as="h2">{editingEntryId ? "Update or remove shopping entry" : "Add a shopping entry"}</Heading>
        <p className="text-sm leading-relaxed text-muted">The app reads the current list, then lets you review an exact versioned command before confirming. Saving or removing a list entry does not record a purchase or change kitchen stock.</p>
        {canEdit && household.user ? <CanonicalCommandControls
          key={`${household.user.uid}:${household.householdId}:${editingEntryId || "new"}`}
          getIdToken={() => household.user!.getIdToken()}
          householdId={household.householdId}
          enabled={enabled}
          onCommitted={live.refresh}
          showKitchen={false}
          initialShoppingEntryId={editingEntryId || undefined}
        /> : <p className="text-sm text-muted">Sign in and choose an active household before changing the list. <Link className="font-semibold text-primary underline" href="/account">Open Account</Link></p>}
      </Card>
    </section>}
  </div>;
}
