import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

export function PublicShell({ children }: { children: ReactNode }) {
	return <div className="min-h-screen bg-background text-foreground">
		<a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-primary focus:px-5 focus:py-3 focus:text-white">Skip to content</a>
		<header className="sticky top-0 z-30 border-b border-line/70 bg-background/90 backdrop-blur-xl">
			<div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
				<Link href="/" aria-label="EcoLoop home" className="flex min-h-11 items-center gap-2.5 rounded-xl">
					<span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-white"><Icon name="leaf" size={21}/></span>
					<span className="leading-tight"><span className="block text-base font-extrabold tracking-tight text-primary">EcoLoop</span><span className="block text-[10px] font-semibold uppercase tracking-[.14em] text-muted">Good food, shared thoughtfully</span></span>
				</Link>
				<div className="flex items-center gap-2"><Link href="/login" className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-primary hover:bg-surface-muted">Sign in</Link><Link href="/login?mode=personal" className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary-container">Get started</Link></div>
			</div>
		</header>
		<main id="main-content">{children}</main>
		<footer className="border-t border-line bg-surface-muted px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-6xl flex-col gap-3 text-xs text-muted sm:flex-row sm:items-center sm:justify-between"><span className="font-semibold text-primary">EcoLoop</span><span>Keep what you have in view. Share surplus with care.</span><Link className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline" href="/login">Sign in to EcoLoop</Link></div></footer>
	</div>;
}
