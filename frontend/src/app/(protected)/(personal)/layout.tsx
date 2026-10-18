import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PersonalWorkspaceBoundary } from "@/components/auth/personal-workspace-boundary";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = { title: "EcoLoop · Your household" };

export default function PersonalLayout({ children }: { children: ReactNode }) {
	return <PersonalWorkspaceBoundary><AppShell>{children}</AppShell></PersonalWorkspaceBoundary>;
}
