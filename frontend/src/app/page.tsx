"use client";

import Image from "next/image";
import Link from "next/link";
import { useDemo } from "@/lib/demo-store";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Icon } from "@/components/ui/icon";

function amountLabel(amount: number | null, unit: string | null) {
  return amount === null || !unit ? "Amount not recorded" : `${amount} ${unit}`;
}

function Shortcut({ href, icon, label }: { href: string; icon: string; label: string }) {
  return <Link href={href} className="flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-full bg-surface-muted px-2 py-2 text-center text-primary transition-colors hover:bg-primary-soft focus-visible:outline-offset-2"><Icon name={icon} size={23}/><span className="text-xs font-bold">{label}</span></Link>;
}

export default function HomePage() {
  const { items, mealPlan, activities, hydrated } = useDemo();
  const focusItem = items.find((item) => /spinach/i.test(item.name)) ?? items[0];
  const otherItems = items.filter((item) => item.id !== focusItem?.id).slice(0, 2);
  const outcomeCount = activities.filter((event) => ["used", "stored", "shared", "discarded"].includes(event.type)).length;
  const knownAmounts = activities.filter((event) => event.measurementBasis !== "unknown" && event.amount !== null && event.unit !== null).length;

  if (!hydrated) return <div className="space-y-4" aria-label="Loading demo kitchen"><div className="h-7 w-2/3 animate-pulse rounded-xl bg-surface-muted"/><div className="h-56 animate-pulse rounded-card bg-surface-muted"/><div className="h-32 animate-pulse rounded-card bg-surface-muted"/></div>;

  return <div className="space-y-7 sm:space-y-9">
    <section className="space-y-1">
      <p className="text-xs font-extrabold uppercase tracking-[.14em] text-muted">Your little kitchen companion</p>
      <Heading as="h1" className="max-w-2xl">Good evening! What would you like to make today?</Heading>
      <p className="text-sm leading-relaxed text-muted">A simple note of what you have can make the next choice easier.</p>
    </section>

    <Card className="relative overflow-hidden bg-primary-container p-5 text-white shadow-card sm:p-7">
      <div aria-hidden="true" className="absolute -right-12 -top-16 size-56 rounded-full bg-white/[.07]" />
      <div className="relative space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge tone="amber" className="bg-white/15 text-white">A DEMO DINNER IDEA</Badge>
          <span className="text-xs font-semibold text-white/75">For {mealPlan.servings} {mealPlan.servings === 1 ? "person" : "people"}</span>
        </div>
        <div><Heading as="h2" className="text-white">Tomato and spinach pasta</Heading><p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">A scripted idea inspired by this sample kitchen. Check the items yourself before cooking.</p></div>
        <Link href="/ask" className="flex min-h-14 w-full items-center justify-between gap-3 rounded-full bg-white px-5 text-sm font-extrabold text-primary shadow-sm transition-colors hover:bg-primary-soft focus-visible:outline-white sm:max-w-sm">
          <span className="flex items-center gap-2"><Icon name="ask" size={21}/>Plan with EcoLoop</span><span className="flex size-8 items-center justify-center rounded-full bg-primary-soft"><Icon name="arrow" size={17}/></span>
        </Link>
        <p className="text-[11px] leading-relaxed text-white/60">Scripted demo suggestion · no AI service connected · making a plan does not change food amounts</p>
      </div>
    </Card>

    <section aria-label="Quick links" className="grid grid-cols-3 gap-2.5">
      <Shortcut href="/kitchen/add" icon="add" label="Add food"/>
      <Shortcut href="/shop" icon="shop" label="Shopping list"/>
      <Shortcut href="/ask" icon="ask" label="Meal ideas"/>
    </section>

    <section aria-labelledby="attention-heading" className="space-y-3">
      <div className="flex items-end justify-between gap-2"><div><Heading id="attention-heading" as="h2">Needs a little attention</Heading><p className="mt-1 text-xs text-muted">Dates and freshness are unknown unless you recorded them.</p></div><Link href="/kitchen" className="flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-bold text-primary hover:bg-primary-soft">View kitchen <Icon name="arrow" size={16}/></Link></div>
      {focusItem ? <>
        <Card className="overflow-hidden border border-line/70 p-3 sm:p-4">
          <Link href={`/kitchen/items/${encodeURIComponent(focusItem.id)}`} className="block rounded-2xl focus-visible:outline-offset-2"><div className="flex gap-3">
            <div className="relative size-[88px] shrink-0 overflow-hidden rounded-2xl bg-surface-muted sm:size-24"><Image src="/artwork/produce-bowl.svg" alt="Illustration of leafy greens and tomatoes" fill sizes="96px" className="object-cover"/></div>
            <div className="min-w-0 flex-1 py-1"><Badge tone="terra" className="mb-1">Date not recorded</Badge><h3 className="truncate font-bold text-primary">{focusItem.name}</h3><p className="mt-0.5 text-sm text-muted">{amountLabel(focusItem.amount, focusItem.unit)}</p><p className="mt-1 text-xs leading-relaxed text-muted">Check this observation when you use it. A photo or date cannot tell us if food is safe.</p></div>
          </div></Link>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
            <Link href="/ask" className="flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-xs font-bold text-white"><Icon name="ask" size={16}/>Ask about it</Link>
            <Link href={`/kitchen/items/${encodeURIComponent(focusItem.id)}`} className="flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-surface-muted px-3 text-xs font-bold text-primary"><Icon name="edit" size={15}/>Open food note</Link>
          </div>
        </Card>
        {otherItems.length > 0 && <div className="grid grid-cols-2 gap-2">{otherItems.map((item) => <Link key={item.id} href={`/kitchen/items/${encodeURIComponent(item.id)}`} className="block rounded-full focus-visible:outline-offset-2"><Card className="flex min-h-[70px] items-center justify-between gap-2 px-4 py-3"><span className="min-w-0"><span className="block truncate text-sm font-bold text-primary">{item.name}</span><span className="mt-0.5 block truncate text-xs text-muted">{amountLabel(item.amount, item.unit)}</span></span><Icon name="arrow" size={17} className="shrink-0 text-muted"/></Card></Link>)}</div>}
      </> : <Card className="p-5 text-center"><p className="font-semibold text-primary">Nothing in your kitchen yet</p><Link href="/kitchen/add" className="mt-2 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-white">Add food</Link></Card>}
    </section>

    <section aria-labelledby="activity-summary-heading">
      <Card className="bg-surface-muted p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2"><Heading id="activity-summary-heading" as="h2">Kitchen activity</Heading><span className="text-xs font-semibold text-muted">Recorded here</span></div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white p-3"><p className="text-2xl font-extrabold tracking-tight text-primary">{outcomeCount}</p><p className="mt-0.5 text-xs text-muted">Outcome notes recorded</p></div>
          <div className="rounded-2xl bg-white p-3"><p className="text-2xl font-extrabold tracking-tight text-secondary">{knownAmounts}</p><p className="mt-0.5 text-xs text-muted">Notes with an amount</p></div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs leading-relaxed text-muted"><span>Plans and suggestions do not count as meals or food used.</span><Link href="/activity" className="flex min-h-11 shrink-0 items-center gap-1 font-bold text-primary">See activity <Icon name="arrow" size={15}/></Link></div>
      </Card>
    </section>

    <p className="text-center text-xs leading-relaxed text-muted">Demo mode · changes are saved in this browser only. No Google AI or managed memory is connected.</p>
  </div>;
}
