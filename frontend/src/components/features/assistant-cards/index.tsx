import Link from "next/link";
import { Badge, Button, Card, Heading } from "@/components/ui";
import type { FoodItem } from "@/lib/contracts";
import { isExpired, type AssistantEnvelope, type BuyCheck, type FoodAction, type MealSuggestion, type PortionAdjustment, type PreferenceConsent, type ProposalCard } from "@/lib/assistant-cards";

type State = "loading" | "error" | "ready";
type Props = { envelope?: AssistantEnvelope | null; rejectedCards?: number; state?: State; items?: FoodItem[]; onRetry?: () => void };
const titleByType: Record<ProposalCard["type"], string> = {
  MealSuggestion: "Meal suggestion", PortionAdjustment: "Portion adjustment", BuyCheck: "Buy check", FoodAction: "Food action", PreferenceConsent: "Preference consent",
};

function ProposalStatus({ card }: { card: ProposalCard }) {
  const expired = isExpired(card);
  return <div className="flex flex-wrap gap-2" aria-label="Proposal status">
    <Badge tone={card.simulated ? "amber" : "green"}>{card.simulated ? "Simulated proposal" : "Pending proposal"}</Badge>
    {expired ? <Badge tone="terra">Expired · refresh to review</Badge> : <Badge>Pending · v{card.version}</Badge>}
  </div>;
}

function ReviewLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="inline-flex min-h-11 items-center rounded-full bg-primary-soft px-4 py-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{children}</Link>;
}

function ActionUnavailable({ card }: { card: ProposalCard }) {
  const expired = isExpired(card);
  return <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
    <Button disabled aria-describedby={`approval-${card.proposal_id}`} variant="secondary">{expired ? "Proposal expired" : "Approval unavailable"}</Button>
    <p id={`approval-${card.proposal_id}`} className="max-w-xl text-xs leading-relaxed text-muted">{expired ? "This proposal is past its expiry time. Review current records before requesting another." : "Proposal approval is not connected yet. Open the relevant screen to review your choices."}</p>
  </div>;
}

function MealCard({ card, items }: { card: MealSuggestion; items: FoodItem[] }) {
  return <><Heading as="h3" className="mt-2">{card.title}</Heading><p className="mt-1 text-sm text-muted">For {card.servings} {card.servings === 1 ? "person" : "people"}. Ingredient amounts are suggestions only.</p>
    {card.ingredients.length ? <ul className="mt-4 space-y-2">{card.ingredients.map((ingredient, index) => {
      const match = ingredient.item_id ? items.find((item) => item.id === ingredient.item_id) : items.find((item) => item.name.toLocaleLowerCase() === ingredient.name.toLocaleLowerCase());
      return <li key={`${ingredient.item_id ?? ingredient.name}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-muted px-4 py-3"><span className="min-w-0 flex-1 text-sm font-medium">{ingredient.name}{ingredient.amount !== null && ingredient.unit ? ` · ${ingredient.amount} ${ingredient.unit}` : " · amount not specified"}{ingredient.uncertain ? " · uncertain" : ""}</span>{match ? <ReviewLink href={`/kitchen/items/${encodeURIComponent(match.id)}`}>Review Kitchen record</ReviewLink> : <ReviewLink href="/kitchen">Review Kitchen</ReviewLink>}</li>;
    })}</ul> : <p className="mt-3 text-sm text-muted">No ingredients were supplied.</p>}
  </>;
}
function PortionCard({ card }: { card: PortionAdjustment }) {
  return <><p className="mt-3 text-sm leading-6">Servings: <strong>{card.original_servings}</strong> → <strong>{card.proposed_servings}</strong></p>{card.changes.length ? <ul className="mt-3 space-y-2">{card.changes.map((change, index) => <li key={`${change.item_id ?? change.name}-${index}`} className="rounded-2xl bg-surface-muted px-4 py-3 text-sm"><p className="font-semibold">{change.name}</p><p className="mt-1 text-muted">{change.original_amount ?? "Unknown"}{change.unit ? ` ${change.unit}` : ""} → {change.proposed_amount ?? "Unknown"}{change.unit ? ` ${change.unit}` : ""}</p>{change.reason && <p className="mt-1 text-muted">{change.reason}</p>}</li>)}</ul> : <p className="mt-3 text-sm text-muted">No quantity changes were supplied.</p>}<div className="mt-3"><ReviewLink href="#meal-plan">Review meal plan</ReviewLink></div></>;
}
function BuyCard({ card }: { card: BuyCheck }) {
  return <><p className="mt-3 text-sm font-semibold">{card.item_name}</p><p className="mt-1 text-sm text-muted">Stock: {card.stock_state.toLocaleLowerCase().replaceAll("_", " ")} · suggested list choice: {card.shopping_action}</p><div className="mt-3"><ReviewLink href="/shop">Review shopping list</ReviewLink></div></>;
}
function FoodCard({ card, items }: { card: FoodAction; items: FoodItem[] }) {
  const known = items.some((item) => item.id === card.item_id);
  return <><p className="mt-3 text-sm">Proposed action: <strong>{card.action.toLocaleLowerCase()}</strong>{card.amount !== null && card.unit ? ` · ${card.amount} ${card.unit}` : " · amount unknown"}</p><div className="mt-3"><ReviewLink href={known ? `/kitchen/items/${encodeURIComponent(card.item_id)}` : "/kitchen"}>{known ? "Review item" : "Review Kitchen"}</ReviewLink></div></>;
}
function PreferenceCard({ card }: { card: PreferenceConsent }) {
  return <><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Preference preview · {card.preference_key}</p><blockquote className="mt-2 rounded-2xl bg-surface-muted p-4 text-sm leading-relaxed">{card.proposed_text}</blockquote><p className="mt-2 text-xs text-muted">This proposal does not save anything. Explicit consent is required.</p><div className="mt-3"><ReviewLink href="#preference-consent">Review consent options</ReviewLink></div></>;
}

function TypedCard({ card, items }: { card: ProposalCard; items: FoodItem[] }) {
  let content: React.ReactNode;
  switch (card.type) {
    case "MealSuggestion": content = <MealCard card={card} items={items} />; break;
    case "PortionAdjustment": content = <PortionCard card={card} />; break;
    case "BuyCheck": content = <BuyCard card={card} />; break;
    case "FoodAction": content = <FoodCard card={card} items={items} />; break;
    case "PreferenceConsent": content = <PreferenceCard card={card} />; break;
  }
  return <Card className="min-w-0 break-words border border-line p-4 sm:p-5 [overflow-wrap:anywhere]">
    <div className="flex flex-wrap items-start justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-primary">{titleByType[card.type]}</p><ProposalStatus card={card} /></div>
    {content}<ActionUnavailable card={card} />
  </Card>;
}

export function AssistantCards({ envelope, rejectedCards = 0, state = "ready", items = [], onRetry }: Props) {
  if (state === "loading") return <Card className="border border-line p-5" aria-live="polite"><p className="text-sm text-muted">Loading scripted proposal examples…</p></Card>;
  if (state === "error" || !envelope) return <Card className="border border-danger/30 bg-danger-soft p-5" role="alert"><p className="font-semibold text-danger">Assistant proposals are unavailable.</p><p className="mt-1 text-sm text-foreground">You can still review your kitchen and shopping list.</p><div className="mt-3 flex flex-wrap gap-2"><ReviewLink href="/kitchen">Open Kitchen</ReviewLink><ReviewLink href="/shop">Open Shop</ReviewLink>{onRetry && <Button variant="secondary" onClick={onRetry}>Retry examples</Button>}</div></Card>;
  return <section aria-labelledby="proposal-heading" className="space-y-3">
    <Card className="border border-line p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><Heading id="proposal-heading" as="h2">Ideas to review</Heading><Badge tone="amber">Scripted demo</Badge></div><p className="mt-2 text-sm leading-relaxed">{envelope.message}</p><p className="mt-2 text-xs text-muted">Reviewing a card does not approve it or change records.</p></Card>
    {rejectedCards > 0 && <Card className="border border-tertiary/30 bg-tertiary-soft p-4" role="status"><p className="text-sm">{rejectedCards} unsupported or invalid card {rejectedCards === 1 ? "was" : "were"} safely omitted. Retry or review the source record.</p>{onRetry && <Button className="mt-3" variant="secondary" onClick={onRetry}>Retry examples</Button>}</Card>}
    {envelope.cards.length === 0 ? <Card className="border border-line p-4" role="status"><p className="text-sm text-muted">No valid proposals to show. You can retry your prompt or review your records.</p><div className="mt-3 flex flex-wrap gap-2"><ReviewLink href="/kitchen">Review Kitchen</ReviewLink><ReviewLink href="/shop">Review Shop</ReviewLink>{onRetry && <Button variant="secondary" onClick={onRetry}>Retry examples</Button>}</div></Card> : <div className="grid gap-3 sm:grid-cols-2">{envelope.cards.map((card) => <TypedCard key={card.proposal_id} card={card} items={items} />)}</div>}
  </section>;
}
