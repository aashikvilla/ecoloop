"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { OrganizationWorkspace, type OrganizationView } from "@/components/organization/organization-workspace";
import { Icon } from "@/components/ui/icon";

const destinations: { href: string; label: string; icon: string; view: OrganizationView }[] = [
	{ href: "/organization", label: "Nearby offers", icon: "map", view: "offers" },
	{ href: "/organization/plans", label: "Collection plans", icon: "clipboard", view: "plans" },
	{ href: "/organization/impact", label: "Received impact", icon: "chart", view: "impact" },
	{ href: "/organization/profile", label: "Pickup profile", icon: "organization", view: "profile" },
];

export function OrganizationShell({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const view = destinations.find((item) => item.href === pathname)?.view ?? "offers";
	return <div className="min-h-screen bg-background text-foreground">
		<a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-primary focus:px-5 focus:py-3 focus:text-white">Skip to content</a>
		<header className="sticky top-0 z-30 border-b border-line/70 bg-background/90 backdrop-blur-xl"><div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"><Link href="/organization" className="flex min-h-11 items-center gap-2.5 rounded-xl"><span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-white"><Icon name="leaf" size={21}/></span><span className="leading-tight"><span className="block text-base font-extrabold text-primary">EcoLoop</span><span className="block text-[10px] font-semibold uppercase tracking-[.14em] text-muted">Organization</span></span></Link><SignOutButton/></div></header>
		<aside className="fixed inset-y-0 left-0 z-20 hidden w-[220px] border-r border-line/70 bg-background px-4 pt-24 md:block">
			<p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[.16em] text-muted">Organization</p>
			<nav aria-label="Organization navigation" className="space-y-1">
				{destinations.map(({ href, label, icon }) => {
					const active = pathname === href;
					return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition-colors ${active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-muted hover:text-primary"}`}><Icon name={icon} size={19}/>{label}</Link>;
				})}
			</nav>
			<div className="absolute inset-x-4 bottom-6 rounded-2xl bg-primary-container p-4 text-white"><p className="text-xs font-bold">Recipient workspace</p><p className="mt-1 text-xs leading-relaxed text-white/75">Find nearby food, plan collections and confirm what arrived.</p></div>
		</aside>
		<main id="main-content" className="mx-auto min-h-[calc(100vh-68px)] max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8 md:ml-[220px] md:px-7 md:pb-12 lg:px-8"><OrganizationWorkspace view={view}/>{children}</main>
		<nav aria-label="Organization navigation" className="fixed inset-x-0 bottom-3 z-40 mx-auto w-full max-w-[520px] px-3 safe-bottom md:hidden"><div className="flex items-stretch justify-between gap-1 rounded-full border border-white/80 bg-white/95 p-1.5 shadow-card backdrop-blur-xl">{destinations.map(({ href, label, icon }) => {
			const active = pathname === href;
			return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 transition-colors ${active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-muted hover:text-primary"}`}><Icon name={icon} size={19}/><span className="truncate text-[9px] font-bold">{label}</span></Link>;
		})}</div></nav>
	</div>;
}
