import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { LiveHouseholdProvider } from "@/lib/live-household";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
	title: "EcoLoop · Food, shared thoughtfully",
	description: "Keep track of food at home and share surplus with local organizations.",
  applicationName: "EcoLoop",
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: ReactNode }) {
	return <html lang="en" className={plusJakarta.variable}><body><LiveHouseholdProvider>{children}</LiveHouseholdProvider></body></html>;
}
