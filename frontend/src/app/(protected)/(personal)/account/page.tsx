import type { Metadata } from "next";
import { AccountConnection } from "@/components/account/account-connection";

export const metadata: Metadata = { title: "Household connection · EcoLoop" };

export default function AccountPage() {
  return <AccountConnection />;
}
