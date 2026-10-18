import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { SignOutButton } from "@/components/auth/sign-out-button";

export function OrganizationShell({ children }: { children: ReactNode }) {
	return <div className="min-h-screen bg-background text-foreground">
		<a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-primary focus:px-5 focus:py-3 focus:text-white">Skip to content</a>
		<header className="sticky top-0 z-30 border-b border-line/70 bg-background/90 backdrop-blur-xl"><div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"><Link href="/organization" className="flex min-h-11 items-center gap-2.5 rounded-xl"><span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-white"><Icon name="leaf" size={21}/></span><span className="leading-tight"><span className="block text-base font-extrabold text-primary">EcoLoop</span><span className="block text-[10px] font-semibold uppercase tracking-[.14em] text-muted">Organization</span></span></Link><SignOutButton/></div></header>
		<main id="main-content" className="mx-auto min-h-[calc(100vh-68px)] max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">{children}</main>
	</div>;
}
