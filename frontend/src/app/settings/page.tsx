import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Icon } from "@/components/ui/icon";
import { PreferenceControls } from "@/components/account/preference-controls";

export default function SettingsPage() {
  return <div className="mx-auto max-w-3xl space-y-6">
    <header><Badge tone="amber" className="mb-3">HOUSEHOLD SETTINGS</Badge><Heading as="h1">Your preferences, your choice</Heading><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Personal settings are available when they are stored and managed by the household service.</p></header>
    <Card className="border border-line p-5 sm:p-6"><Heading as="h2">Account connection</Heading><p className="mt-2 text-sm leading-relaxed text-muted">Sign in to manage personal preferences. Create or select a household to view its Kitchen and shared controls.</p><Link href="/account" className="mt-3 inline-flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-primary underline underline-offset-4">Open account connection</Link></Card>
    <PreferenceControls />
    <Card className="flex items-start gap-3 border border-line p-5 sm:p-6"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary-soft text-secondary"><Icon name="info" size={21}/></span><div><Heading as="h2">Capture and item actions</Heading><p className="mt-2 text-sm leading-relaxed text-muted">Manual, text, and photo candidate capture are available in Kitchen. Photo extraction needs the local Gemini service enabled; the image is not stored by EcoLoop, and every candidate needs your review. Item outcomes and owner-reported private sharing require a signed-in household member and an explicit review before saving.</p><Link href="/account" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline">Open Account controls</Link></div></Card>
  </div>;
}
