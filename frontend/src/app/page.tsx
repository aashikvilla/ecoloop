"use client";

import Link from "next/link";
import { useDemo } from "@/lib/demo-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Icon } from "@/components/ui/icon";

function amountLabel(amount: number | null, unit: string | null) {
  return amount === null || !unit ? "Amount not recorded" : `${amount} ${unit}`;
}

export default function HomePage() {
  const { items, mealPlan, hydrated } = useDemo();
  const attentionItems = items.slice(0, 3);

  if (!hydrated) return <div className="space-y-4" aria-label="Loading demo kitchen"><div className="h-7 w-2/3 animate-pulse rounded-xl bg-surface-muted"/><div className="h-56 animate-pulse rounded-card bg-surface-muted"/><div className="h-32 animate-pulse rounded-card bg-surface-muted"/></div>;

  return <div className="space-y-7 sm:space-y-9">
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <Badge tone="amber" className="mb-3 sm:hidden">DEMO · SAVED IN THIS BROWSER</Badge>
        <p className="mb-1 text-xs font-extrabold uppercase tracking-[.16em] text-muted">A calmer kitchen starts small</p>
        <Heading as="h1">What would feel useful tonight?</Heading>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">Keep a simple note of what you have, then decide what to make or pick up.</p>
      </div>
      <Link href="/kitchen/add"><Button size="lg"><Icon name="add" size={19}/>Add food</Button></Link>
    </section>

    <Card className="relative overflow-hidden bg-primary-container p-5 text-white sm:p-8">
      <div aria-hidden="true" className="absolute -right-12 -top-16 size-56 rounded-full bg-white/[.07]" />
      <div className="relative grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <Badge tone="amber" className="mb-4 bg-white/15 text-white">A DEMO DINNER IDEA</Badge>
          <Heading as="h2" className="max-w-xl text-white">A cozy tomato and spinach pasta</Heading>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75">A scripted suggestion using items in this sample kitchen. Check what you have before you start.</p>
          <p className="mt-3 text-xs font-semibold text-white/65">For {mealPlan.servings} {mealPlan.servings === 1 ? "person" : "people"} · Your plan does not change kitchen amounts</p>
        </div>
        <Link href="/ask"><Button variant="secondary" size="lg" className="w-full bg-white text-primary hover:bg-primary-soft sm:w-auto">Ask for an idea <Icon name="arrow" size={18}/></Button></Link>
      </div>
    </Card>

    <section aria-labelledby="shortcuts-title">
      <div className="mb-3 flex items-center justify-between"><Heading id="shortcuts-title" as="h2">Your next step</Heading><Link href="/settings" className="flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-muted hover:bg-surface-muted hover:text-primary">Preferences <Icon name="arrow" size={16}/></Link></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link href="/kitchen/add" className="group"><Card className="flex min-h-24 items-center gap-4 p-4 transition-transform group-hover:-translate-y-0.5"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary"><Icon name="add" size={23}/></span><span><span className="block font-bold text-primary">Add an item</span><span className="mt-0.5 block text-xs text-muted">Write down what you have</span></span></Card></Link>
        <Link href="/shop" className="group"><Card className="flex min-h-24 items-center gap-4 p-4 transition-transform group-hover:-translate-y-0.5"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary-soft text-secondary"><Icon name="shop" size={22}/></span><span><span className="block font-bold text-primary">Check your list</span><span className="mt-0.5 block text-xs text-muted">{items.length ? "Review before you shop" : "Start a simple list"}</span></span></Card></Link>
        <Link href="/activity" className="group"><Card className="flex min-h-24 items-center gap-4 p-4 transition-transform group-hover:-translate-y-0.5"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface-muted text-primary"><Icon name="clock" size={22}/></span><span><span className="block font-bold text-primary">See activity</span><span className="mt-0.5 block text-xs text-muted">Only what you recorded</span></span></Card></Link>
      </div>
    </section>

    <section aria-labelledby="kitchen-preview-title">
      <div className="mb-3 flex items-end justify-between"><div><Heading id="kitchen-preview-title" as="h2">In your kitchen</Heading><p className="mt-1 text-sm text-muted">These are sample observations, not a live inventory.</p></div><Link href="/kitchen" className="flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-bold text-primary hover:bg-primary-soft">Open kitchen <Icon name="arrow" size={16}/></Link></div>
      {items.length === 0 ? <Card className="p-6 text-center"><p className="font-semibold text-primary">Your demo kitchen is empty</p><p className="mt-1 text-sm text-muted">Add a food item when you are ready.</p><Link href="/kitchen/add" className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-white">Add food</Link></Card> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {attentionItems.map((item, index) => <Link key={item.id} href={`/kitchen/items/${encodeURIComponent(item.id)}`} className="group"><Card className="flex min-h-24 items-center gap-4 p-4 transition-transform group-hover:-translate-y-0.5">
          <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${index === 0 ? "bg-primary-soft text-primary" : index === 1 ? "bg-tertiary-soft text-tertiary" : "bg-secondary-soft text-secondary"}`}><Icon name="leaf" size={22}/></span>
          <span className="min-w-0 flex-1"><span className="block truncate font-bold text-primary">{item.name}</span><span className="mt-0.5 block text-xs text-muted">{amountLabel(item.amount, item.unit)} · date unknown</span><span className="mt-1 block text-[11px] font-medium text-muted">Last checked {new Date(item.observedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></span>
          <Icon name="arrow" size={17} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5"/>
        </Card></Link>)}
      </div>}
    </section>
    <p className="text-center text-xs leading-relaxed text-muted">Your demo data stays in this browser. It does not connect to Google AI or managed memory.</p>
  </div>;
}
