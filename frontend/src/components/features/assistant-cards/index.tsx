import type { ReactNode } from "react";
import Link from "next/link";
import { Badge, Button, Card, Heading } from "@/components/ui";
import { isExpired, type AssistantEnvelope, type ProposalCard } from "@/lib/assistant-cards";

const titleByType: Record<ProposalCard["type"], string> = {
  MealSuggestion: "Meal suggestion", PortionAdjustment: "Portion adjustment", BuyCheck: "Buy check", FoodAction: "Food action", PreferenceConsent: "Preference consent",
};

function ReviewLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="inline-flex min-h-11 items-center rounded-full bg-primary-soft px-4 py-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{children}</Link>;
}

function ProposalStatus({ card }: { card: ProposalCard }) {
  const expired = isExpired(card);
  return <div className="flex flex-wrap gap-2" aria-label="Proposal status">
    <Badge tone={card.simulated ? "amber" : "green"}>{card.simulated ? "Simulated proposal" : "Pending proposal"}</Badge>
    {expired ? <Badge tone="terra">Expired</Badge> : <Badge>Pending · v{card.version}</Badge>}
  </div>;
}

function ProposalDetails({ card }: { card: ProposalCard }) {
  switch (card.type) {
    case "MealSuggestion": return <><Heading as="h3" className="mt-2">{card.title}</Heading><p className="mt-1 text-sm text-muted">For {card.servings} {card.servings === 1 ? "person" : "people"}. Amounts are suggestions; check food and quantities yourself.</p><ul className="mt-3 space-y-2">{card.ingredients.map((ingredient, index) => <li key={`${ingredient.item_id ?? ingredient.name}-${index}`} className="rounded-xl bg-surface-muted px-3 py-2 text-sm">{ingredient.name} · {ingredient.amount !== null && ingredient.unit ? `${ingredient.amount} ${ingredient.unit}` : "amount unknown"}{ingredient.uncertain ? " · uncertain" : ""}</li>)}</ul><div className="mt-3"><ReviewLink href="/kitchen">Review Kitchen</ReviewLink></div></>;
    case "PortionAdjustment": return <><p className="mt-3 text-sm">Servings: <strong>{card.original_servings}</strong> → <strong>{card.proposed_servings}</strong></p><ul className="mt-3 space-y-2">{card.changes.map((change, index) => <li key={`${change.item_id ?? change.name}-${index}`} className="rounded-xl bg-surface-muted px-3 py-2 text-sm"><strong>{change.name}</strong><p className="mt-1 text-muted">{change.original_amount ?? "Unknown"}{change.unit ? ` ${change.unit}` : ""} → {change.proposed_amount ?? "Unknown"}{change.unit ? ` ${change.unit}` : ""}</p><p className="mt-1 text-muted">{change.reason}</p></li>)}</ul><p className="mt-3 text-xs text-muted">Meal-plan updates are unavailable. This proposal has not changed records.</p></>;
    case "BuyCheck": return <><p className="mt-3 font-semibold">{card.item_name}</p><p className="mt-1 text-sm text-muted">Stock: {card.stock_state.toLowerCase().replaceAll("_", " ")} · suggested choice: {card.shopping_action}</p><div className="mt-3"><ReviewLink href="/shop">Review shopping list</ReviewLink></div></>;
    case "FoodAction": return <><p className="mt-3 text-sm">Suggested action: <strong>{card.action.toLowerCase()}</strong>{card.amount !== null && card.unit ? ` · ${card.amount} ${card.unit}` : " · amount unknown"}</p><p className="mt-2 text-xs text-muted">Outcome recording and private sharing are not connected. This proposal has not changed records.</p><div className="mt-3"><ReviewLink href="/kitchen">Review Kitchen records</ReviewLink></div></>;
    case "PreferenceConsent": return <><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Preference preview · {card.preference_key}</p><blockquote className="mt-2 rounded-2xl bg-surface-muted p-4 text-sm leading-relaxed">{card.proposed_text}</blockquote><p className="mt-2 text-xs text-muted">This proposal does not save anything. Managed preference controls are unavailable.</p><div className="mt-3"><ReviewLink href="/settings">Review preference status</ReviewLink></div></>;
  }
}

function TypedCard({ card }: { card: ProposalCard }) {
  const expired = isExpired(card);
  return <Card className="min-w-0 break-words border border-line p-4 sm:p-5 [overflow-wrap:anywhere]"><div className="flex flex-wrap items-start justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-primary">{titleByType[card.type]}</p><ProposalStatus card={card} /></div><ProposalDetails card={card} /><div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4"><Button disabled aria-describedby={`approval-${card.proposal_id}`} variant="secondary">{expired ? "Proposal expired" : "Approval unavailable"}</Button><p id={`approval-${card.proposal_id}`} className="max-w-xl text-xs leading-relaxed text-muted">{expired ? "Review current records before asking for another proposal." : "Proposal approval is not connected. This suggestion has not changed household records."}</p></div></Card>;
}

export function AssistantCards({ envelope, rejectedCards = 0 }: { envelope: AssistantEnvelope; rejectedCards?: number }) {
  return <section aria-labelledby="proposal-heading" className="space-y-3"><Card className="border border-line p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><Heading id="proposal-heading" as="h2">Assistant proposals</Heading><Badge tone="green">Returned by household API</Badge></div><p className="mt-2 text-sm leading-relaxed">{envelope.message}</p><p className="mt-2 text-xs text-muted">Reviewing a proposal does not approve it or change records.</p></Card>
    {rejectedCards > 0 && <Card className="border border-tertiary/30 bg-tertiary-soft p-4" role="status"><p className="text-sm">{rejectedCards} unsupported or invalid {rejectedCards === 1 ? "card was" : "cards were"} safely omitted by the schema validator.</p></Card>}
    {envelope.cards.length === 0 ? <Card className="border border-line p-4" role="status"><p className="text-sm text-muted">The assistant returned no valid proposals.</p></Card> : <div className="grid gap-3 sm:grid-cols-2">{envelope.cards.map((card) => <TypedCard key={card.proposal_id} card={card} />)}</div>}
  </section>;
}
