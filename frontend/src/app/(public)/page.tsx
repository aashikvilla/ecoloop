import type { Metadata } from "next";
import { LandingPage } from "@/components/public/landing-page";

export const metadata: Metadata = {
	title: "EcoLoop · Good food, shared thoughtfully",
	description: "Keep household food in view, plan with what you have, and prepare surplus to share with local organizations.",
};

export default function PublicHomePage() {
	return <LandingPage/>;
}
