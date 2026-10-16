import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { DemoProvider } from "@/lib/demo-store";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcoLoop · My kitchen",
  description: "A small, private demo to keep track of what is in your kitchen.",
  applicationName: "EcoLoop",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f3fbf6" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><DemoProvider><AppShell>{children}</AppShell></DemoProvider></body></html>;
}
