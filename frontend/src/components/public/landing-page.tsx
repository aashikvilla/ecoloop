import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Icon } from "@/components/ui/icon";

const steps = [
	{ number: "01", title: "Keep food in view", detail: "Add food to a household kitchen and keep confirmed details together." },
	{ number: "02", title: "Make a thoughtful plan", detail: "Use your kitchen and shopping list to decide what to use next." },
	{ number: "03", title: "Share surplus", detail: "Prepare an offer for review and sharing with an approved organization." },
];

export function LandingPage() {
	return <>
		<section className="overflow-hidden px-4 pb-14 pt-9 sm:px-6 sm:pb-20 sm:pt-14 lg:px-8 lg:pt-16">
			<div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
				<div>
					<p className="inline-flex min-h-8 items-center gap-2 rounded-full bg-surface-raised px-3 text-[11px] font-extrabold uppercase tracking-[.14em] text-primary"><span className="size-2 rounded-full bg-secondary"/>Good food. Brighter tomorrows.</p>
					<Heading as="h1" className="mt-5 max-w-2xl text-[2.5rem] leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">Manage food better.<br/><span className="text-secondary">Share surplus thoughtfully.</span></Heading>
					<p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">EcoLoop helps households keep food and shopping details organized, make plans from what they have, and prepare surplus offers for local food recovery organizations.</p>
					<div className="mt-7 grid gap-3 sm:grid-cols-2">
						<Link href="/login?mode=personal" className="group flex min-h-[68px] items-center justify-between gap-3 rounded-2xl bg-primary px-5 py-3 text-white shadow-card transition-colors hover:bg-primary-container"><span><span className="block font-bold">Continue as Personal</span><span className="mt-0.5 block text-xs text-white/75">Track food at home</span></span><Icon name="arrow" size={20} className="shrink-0 transition-transform group-hover:translate-x-1"/></Link>
						<Link href="/login?mode=organization" className="group flex min-h-[68px] items-center justify-between gap-3 rounded-2xl border border-line bg-white px-5 py-3 font-semibold text-primary transition-colors hover:bg-surface-muted"><span><span className="block">Continue as Organization</span><span className="mt-0.5 block text-xs font-medium text-muted">For food recovery organizations</span></span><Icon name="arrow" size={20} className="shrink-0 transition-transform group-hover:translate-x-1"/></Link>
					</div>
					<ul className="mt-6 grid gap-2 text-sm font-semibold text-primary sm:grid-cols-2"><li className="flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-full bg-primary-soft"><Icon name="check" size={15}/></span>Confirmed details stay clear</li><li className="flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-full bg-secondary-soft"><Icon name="check" size={15}/></span>People stay in control</li></ul>
				</div>
				<div className="relative mx-auto w-full max-w-xl">
					<div className="absolute -right-6 -top-5 size-28 rounded-full bg-tertiary-soft blur-2xl" aria-hidden="true"/>
					<div className="relative overflow-hidden rounded-[2rem] border border-line bg-surface-raised p-4 shadow-card sm:p-6">
						<div className="flex min-h-[360px] flex-col justify-between gap-8 rounded-[1.5rem] bg-background p-5 sm:min-h-[420px] sm:p-7">
							<div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-secondary">A calmer kitchen routine</p><h2 className="mt-1 text-xl font-bold tracking-tight text-primary sm:text-2xl">Your food, in view</h2></div><span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-white"><Icon name="kitchen" size={22}/></span></div>
							<div className="grid grid-cols-[1fr_auto] items-center gap-5">
								<div className="space-y-3"><div className="rounded-2xl border border-line bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-muted">Kitchen</p><p className="mt-1 font-semibold text-primary">Food you have confirmed</p><div className="mt-3 h-2 rounded-full bg-primary-soft"><span className="block h-full w-2/3 rounded-full bg-primary"/></div></div><div className="rounded-2xl border border-line bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-muted">Next step</p><p className="mt-1 text-sm leading-relaxed text-primary">Review what to use, then decide what to share.</p></div></div>
								<div className="hidden rounded-[1.5rem] bg-white p-3 shadow-sm sm:block"><Image src="/artwork/produce-bowl.svg" alt="Illustration of fresh produce in a bowl" width={190} height={190} priority/></div>
							</div>
							<p className="text-xs leading-relaxed text-muted">Illustrative preview. EcoLoop shows records returned for your account; it does not assess food safety.</p>
						</div>
					</div>
				</div>
			</div>
		</section>
		<section id="how-it-works" className="bg-surface-muted px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
			<div className="mx-auto max-w-6xl"><div className="max-w-2xl"><p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-secondary">A simple circular flow</p><Heading as="h2" className="mt-2 text-3xl sm:text-4xl">How EcoLoop works</Heading><p className="mt-3 text-sm leading-6 text-muted sm:text-base">Start with your own kitchen. Choose what happens next, and keep each step explicit.</p></div><div className="mt-7 grid gap-4 md:grid-cols-3">{steps.map((step) => <Card key={step.number} className="h-full border border-line/70 p-5 sm:p-6"><span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-sm font-extrabold text-white">{step.number}</span><Heading as="h3" className="mt-5 text-xl">{step.title}</Heading><p className="mt-2 text-sm leading-6 text-muted">{step.detail}</p></Card>)}</div></div>
		</section>
		<section className="px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
			<div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2">
				<Card className="flex h-full flex-col border border-line p-6 sm:p-8"><span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary"><Icon name="home" size={22}/></span><p className="mt-5 text-[11px] font-extrabold uppercase tracking-[.15em] text-secondary">For households</p><Heading as="h2" className="mt-2 text-2xl">Make the most of what you have.</Heading><p className="mt-3 flex-1 text-sm leading-6 text-muted">Keep a clear kitchen list, ask for help planning with confirmed food, and prepare a surplus offer when you choose to share.</p><Link href="/login?mode=personal" className="mt-5 inline-flex min-h-11 items-center gap-2 font-bold text-primary underline-offset-4 hover:underline">Explore Personal EcoLoop <Icon name="arrow" size={18}/></Link></Card>
				<Card className="flex h-full flex-col border border-line p-6 sm:p-8"><span className="flex size-11 items-center justify-center rounded-2xl bg-secondary-soft text-secondary"><Icon name="organization" size={22}/></span><p className="mt-5 text-[11px] font-extrabold uppercase tracking-[.15em] text-secondary">For food recovery organizations</p><Heading as="h2" className="mt-2 text-2xl">Connect community food efforts.</Heading><p className="mt-3 flex-1 text-sm leading-6 text-muted">EcoLoop keeps personal kitchens and organization membership separate. Organization access is limited to approved members.</p><Link href="/login?mode=organization" className="mt-5 inline-flex min-h-11 items-center gap-2 font-bold text-primary underline-offset-4 hover:underline">Continue as Organization <Icon name="arrow" size={18}/></Link></Card>
			</div>
		</section>
		<section className="px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8"><div className="mx-auto max-w-6xl rounded-[2rem] bg-primary px-6 py-8 text-white shadow-card sm:px-10 sm:py-10"><div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center"><div className="max-w-2xl"><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-white/70">A thoughtful loop</p><Heading as="h2" className="mt-2 text-2xl text-white sm:text-3xl">Good food can go further when every step is clear.</Heading><p className="mt-3 text-sm leading-6 text-white/75">EcoLoop keeps suggestions separate from confirmed records and leaves sharing decisions with people.</p></div><Link href="/login?mode=personal" className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-primary hover:bg-primary-soft">Get started <Icon name="arrow" size={18}/></Link></div></div></section>
	</>;
}
