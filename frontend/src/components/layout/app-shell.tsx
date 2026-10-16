"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";

const destinations = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/kitchen", label: "Kitchen", icon: "kitchen" },
  { href: "/ask", label: "Ask", icon: "ask" },
  { href: "/shop", label: "Shop", icon: "shop" },
];

function DestinationNav({ pathname }: { pathname: string }) {
  return <nav aria-label="Main navigation" className="flex items-center justify-between gap-1 rounded-full border border-white/80 bg-white/95 p-1.5 shadow-card backdrop-blur-xl">
    {destinations.map(({ href, label, icon }) => {
      const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
      return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1 transition-colors ${active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-muted hover:text-primary"}`}>
        <Icon name={icon} size={21} />
        <span className="text-[11px] font-bold">{label}</span>
      </Link>;
    })}
  </nav>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const accountPage = pathname === "/account" || pathname.startsWith("/account/");
  const itemDetailPage = /^\/kitchen\/items\/[^/]+$/.test(pathname);
  const canonicalPage = ["/", "/kitchen", "/ask", "/shop", "/activity"].includes(pathname) || itemDetailPage;
  const settingsPage = pathname === "/settings";
  const intakePage = pathname === "/kitchen/add" || pathname === "/kitchen/review";
  const statusLabel = accountPage ? "HOUSEHOLD ACCOUNT" : canonicalPage ? "HOUSEHOLD DATA" : intakePage ? "KITCHEN INTAKE" : settingsPage ? "HOUSEHOLD SETTINGS" : "FEATURE UNAVAILABLE";
  return <div className="min-h-screen bg-background text-foreground">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-primary focus:px-5 focus:py-3 focus:text-white">Skip to content</a>
    <header className="sticky top-0 z-30 border-b border-line/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-4 sm:px-7">
        <Link href="/" aria-label="EcoLoop home" className="flex items-center gap-2.5 rounded-xl">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary"><Icon name="leaf" size={22} /></span>
          <span className="leading-tight"><span className="block text-[17px] font-extrabold tracking-tight text-primary">EcoLoop</span><span className="block text-[11px] font-medium text-muted">My kitchen</span></span>
        </Link>
        <div className="flex items-center gap-2">
          <Badge tone="amber" className="text-[9px] sm:text-xs">{statusLabel}</Badge>
          <Link href="/settings" aria-label="Open settings" className={`flex size-11 items-center justify-center rounded-full transition-colors hover:bg-surface-muted ${pathname === "/settings" ? "bg-primary-soft text-primary" : "text-muted"}`}><Icon name="settings" size={20} /></Link>
        </div>
      </div>
    </header>
    <div className="mx-auto min-h-[calc(100vh-68px)] max-w-6xl px-4 pb-28 pt-5 sm:ml-[208px] sm:px-7 sm:pb-12 sm:pt-8">
      <main id="main-content">{children}</main>
    </div>
    <div className="fixed inset-x-0 bottom-3 z-40 mx-auto w-full max-w-[460px] px-4 safe-bottom sm:hidden"><DestinationNav pathname={pathname} /></div>
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[208px] border-r border-line/70 bg-background px-4 pt-24 sm:block">
      <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[.16em] text-muted">Your kitchen</p>
      <nav aria-label="Main navigation" className="space-y-1">
        {destinations.map(({ href, label, icon }) => {
          const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
          return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition-colors ${active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-muted hover:text-primary"}`}><Icon name={icon} size={19} />{label}</Link>;
        })}
      </nav>
      <Link href="/activity" className={`mt-7 flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold ${pathname === "/activity" ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-muted hover:text-primary"}`}><Icon name="clock" size={19} />Activity</Link>
      <Link href="/settings" className={`mt-1 flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold ${pathname === "/settings" ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-muted hover:text-primary"}`}><Icon name="settings" size={19} />Settings</Link>
      <div className="absolute inset-x-4 bottom-6 rounded-2xl bg-primary-container p-4 text-white">
        <p className="text-xs font-bold">{accountPage ? "Account connection" : itemDetailPage ? "Kitchen item" : canonicalPage ? "Household records" : intakePage ? "Kitchen intake" : settingsPage ? "Household settings" : "Unavailable feature"}</p><p className="mt-1 text-xs leading-relaxed text-white/75">{itemDetailPage ? "Item details show the latest confirmed household record; outcomes and private sharing remain in Account." : accountPage || canonicalPage ? "Live records require sign-in, household membership and an available API." : intakePage ? "Candidate drafts stay separate until you explicitly confirm selected details." : settingsPage ? "Managed preference controls are not connected." : "This item route has no canonical flow yet."}</p>
      </div>
    </aside>
  </div>;
}
