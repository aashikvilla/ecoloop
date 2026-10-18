import type { Metadata } from "next";
import type { ReactNode } from "react";
import { OrganizationShell } from "@/components/layout/organization-shell";

export const metadata: Metadata = { title: "EcoLoop · Organization" };

export default function OrganizationLayout({ children }: { children: ReactNode }) {
	return <OrganizationShell>{children}</OrganizationShell>;
}
