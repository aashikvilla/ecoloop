import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { LiveHouseholdProvider } from "@/lib/live-household";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "EcoLoop · My kitchen",
  description: "A private household kitchen and shopping assistant.",
  applicationName: "EcoLoop",
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

function ShellFallback() {
  return <div className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 px-4 backdrop-blur-xl"><div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between"><Link href="/" className="text-lg font-extrabold text-primary">EcoLoop <span className="text-[10px] font-bold text-muted">MY KITCHEN</span></Link><span className="rounded-full bg-tertiary-soft px-3 py-1 text-[9px] font-extrabold text-tertiary md:text-xs">HOUSEHOLD DATA</span></div></header>
    <main id="main-content" aria-busy="true" aria-label="Loading your kitchen" className="mx-auto min-h-[calc(100vh-68px)] max-w-6xl space-y-5 px-4 pb-28 pt-5 md:ml-[208px] md:px-7 md:pb-12 md:pt-8"><div className="h-8 w-2/3 animate-pulse rounded-xl bg-surface-muted"/><div className="h-64 animate-pulse rounded-card bg-surface-muted"/></main>
    <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-3 z-40 mx-auto flex min-h-14 w-[calc(100%-2rem)] max-w-[460px] items-center justify-around rounded-full border border-white bg-white/95 px-2 shadow-lg md:hidden">
      {[ ["/", "Home"], ["/kitchen", "Kitchen"], ["/ask", "Ask"], ["/shop", "Shop"] ].map(([href, label]) => <Link key={href} href={href} className="flex min-h-11 flex-1 items-center justify-center rounded-full text-xs font-bold text-primary">{label}</Link>)}
    </nav>
  </div>;
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" className={plusJakarta.variable}><body><Suspense fallback={<ShellFallback/>}><LiveHouseholdProvider><AppShell>{children}</AppShell></LiveHouseholdProvider></Suspense></body></html>;
}
