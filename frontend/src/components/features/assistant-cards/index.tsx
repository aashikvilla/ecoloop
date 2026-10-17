import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Badge, Button, Card, Heading } from "@/components/ui";
import { isExpired, type AssistantEnvelope, type MealSuggestion, type PortionAdjustment, type ProposalCard } from "@/lib/assistant-cards";
import type { PreparationStage, ProposalResolution, SavedPreference } from "@/lib/assistant-actions";

const titleByType: Record<ProposalCard["type"], string> = {
  MealSuggestion: "Meal suggestion", PortionAdjustment: "Portion adjustment", BuyCheck: "Buy check", FoodAction: "Food action", PreferenceConsent: "Preference consent",
};

function ReviewLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="inline-flex min-h-11 items-center rounded-full bg-primary-soft px-4 py-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{children}</Link>;
}

function ProposalStatus({ card, resolution }: { card: ProposalCard; resolution?: ProposalResolution }) {
  const expired = isExpired(card);
  return <div className="flex flex-wrap gap-2" aria-label="Proposal status">
    <Badge tone={card.simulated ? "amber" : "green"}>{card.simulated ? "Assistant proposal" : "Pending proposal"}</Badge>
    {resolution ? <Badge tone="green">{resolution.status === "APPROVED" ? (card.type === "MealSuggestion" || card.type === "PortionAdjustment" ? "Meal plan saved" : "Added to list") : "Dismissed"}</Badge> : expired ? <Badge tone="terra">Expired</Badge> : <Badge>Pending · v{card.version}</Badge>}
  </div>;
}

function ProposalDetails({ card }: { card: ProposalCard }) {
  switch (card.type) {
    case "MealSuggestion": return <><Heading as="h3" className="mt-2">{card.title}</Heading><p className="mt-1 text-sm text-muted">For {card.servings} {card.servings === 1 ? "person" : "people"}. Amounts are suggestions; check food and quantities yourself.</p><ul className="mt-3 space-y-2">{card.ingredients.map((ingredient, index) => <li key={`${ingredient.item_id ?? ingredient.name}-${index}`} className="rounded-xl bg-surface-muted px-3 py-2 text-sm">{ingredient.name} · {ingredient.amount !== null && ingredient.unit ? `${ingredient.amount} ${ingredient.unit}` : "amount unknown"}{ingredient.uncertain ? " · uncertain" : ""}</li>)}</ul><div className="mt-3"><ReviewLink href="/kitchen">Review Kitchen</ReviewLink></div></>;
    case "PortionAdjustment": return <><p className="mt-3 text-sm"><strong>Saved meal plan:</strong> {card.plan_title}</p><p className="mt-2 text-sm">Servings: <strong>{card.original_servings}</strong> → <strong>{card.proposed_servings}</strong></p><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">AI preview · ingredient amounts are not persisted</p><ul className="mt-2 space-y-2">{card.changes.map((change, index) => <li key={`${change.item_id ?? change.name}-${index}`} className="rounded-xl bg-surface-muted px-3 py-2 text-sm"><strong>{change.name}</strong><p className="mt-1 text-muted">{change.original_amount ?? "Unknown"}{change.unit ? ` ${change.unit}` : ""} → {change.proposed_amount ?? "Unknown"}{change.unit ? ` ${change.unit}` : ""}</p><p className="mt-1 text-muted">{change.reason}</p></li>)}</ul><p className="mt-3 text-xs text-muted">Approval saves the selected servings and preparation stage. Before preparation, the API applies deterministic scaling only to recognized, certain quantities already saved with this meal plan. The AI preview values above are not saved.</p></>;
    case "BuyCheck": return <><p className="mt-3 font-semibold">{card.item_name}</p><p className="mt-1 text-sm text-muted">Stock: {card.stock_state.toLowerCase().replaceAll("_", " ")} · suggested choice: {card.shopping_action}</p><div className="mt-3"><ReviewLink href="/shop">Review shopping list</ReviewLink></div></>;
    case "FoodAction": {
      const share = card.action === "SHARE";
      const href = `/kitchen/items/${encodeURIComponent(card.item_id)}/${share ? "share" : "outcome"}`;
      return <><p className="mt-3 text-sm">Suggested action: <strong>{card.action.toLowerCase()}</strong>{card.amount !== null && card.unit ? ` · ${card.amount} ${card.unit}` : " · amount unknown"}</p><p className="mt-2 text-xs text-muted">This suggestion does not change Kitchen records. Review the current item and confirm any outcome yourself.</p><div className="mt-3"><ReviewLink href={href}>{share ? "Review private share offer" : "Review item outcome"}</ReviewLink></div></>;
    }
    case "PreferenceConsent": return <><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Preference preview · {card.preference_key}</p><blockquote className="mt-2 rounded-2xl bg-surface-muted p-4 text-sm leading-relaxed">{card.proposed_text}</blockquote><p className="mt-2 text-xs text-muted">This preference is private to your account. It is saved only when you choose “Save this preference.”</p><div className="mt-3"><ReviewLink href="/settings">Review saved preferences</ReviewLink></div></>;
  }
}

type ActionProps = {
  resolutions: Record<string, ProposalResolution>;
  privatePreferences: SavedPreference[];
  preferenceLoadState: "idle" | "loading" | "ready" | "error";
  preferenceErrors: Record<string, string>;
  onAction: (proposalId: string, version: number, action: "ADD" | "DISMISS") => void;
  onMealAction: (proposalId: string, version: number, action: "APPROVE" | "EDIT" | "DISMISS", preparationStage: PreparationStage, proposedServings?: number, planBaseVersion?: number) => void;
  onConsent: (proposalId: string, proposedText: string) => void;
  actionBusy: string | null;
  actionsEnabled: boolean;
};

function TypedCard({ card, resolutions, privatePreferences, preferenceLoadState, preferenceErrors, onAction, onMealAction, onConsent, actionBusy, actionsEnabled }: { card: ProposalCard } & ActionProps) {
  const [servingsText, setServingsText] = useState(card.type === "MealSuggestion" ? String(card.servings) : card.type === "PortionAdjustment" ? String(card.proposed_servings) : "");
  const [preparationStage, setPreparationStage] = useState<PreparationStage>("UNKNOWN");
  const expired = isExpired(card);
  const resolution = resolutions[card.proposal_id];
  const preferenceIdIsValid = /^[A-Za-z0-9_-]{16,64}$/.test(card.proposal_id);
  const existingPreference = card.type === "PreferenceConsent" ? privatePreferences.find((item) => item.preference_id === card.proposal_id) : undefined;
  const savedPreference = existingPreference && card.type === "PreferenceConsent" && existingPreference.text === card.proposed_text ? existingPreference : undefined;
  const preferenceConflict = card.type === "PreferenceConsent" && (!preferenceIdIsValid
    ? "This proposal ID cannot be used for a saved preference. Review preferences in Settings."
    : existingPreference && existingPreference.text !== card.proposed_text
      ? "A different preference already uses this ID. Nothing was changed; review saved preferences in Settings."
      : "");
  const canAct = actionsEnabled && !expired && !resolution;
  const canAdd = card.type === "BuyCheck" && card.shopping_action === "ADD" && card.allowed_actions.includes("ADD");
  const mealCard = card.type === "MealSuggestion" || card.type === "PortionAdjustment";
  const mealProposal = mealCard ? card as MealSuggestion | PortionAdjustment : null;
  const servings = /^\d{1,3}$/.test(servingsText) ? Number(servingsText) : NaN;
  const servingsValid = Number.isSafeInteger(servings) && servings >= 1 && servings <= 100;
  const mealReferenceValid = card.type !== "PortionAdjustment" || (card.plan_title.trim().length > 0 && card.source_refs.length === 1 && /^[A-Za-z0-9._:-]{1,128}$/.test(card.source_refs[0]) && Number.isSafeInteger(card.base_version) && card.base_version >= 1);
  const mealApprovalAllowed = mealCard && card.allowed_actions.includes("APPROVE");
  const mealEditAllowed = mealCard && card.allowed_actions.includes("EDIT");
  const mealDismissAllowed = mealCard && card.allowed_actions.includes("DISMISS");
  const editNeeded = card.type === "MealSuggestion" ? servings !== card.servings : card.type === "PortionAdjustment" ? servings !== card.proposed_servings : false;
  const canSavePreference = card.type === "PreferenceConsent" && card.allowed_actions.includes("CONSENT") && !savedPreference && !preferenceConflict;
  const consentBusy = actionBusy === `${card.proposal_id}:CONSENT`;
  return <Card className="min-w-0 break-words border border-line p-4 sm:p-5 [overflow-wrap:anywhere]"><div className="flex flex-wrap items-start justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-primary">{titleByType[card.type]}</p><div className="flex flex-wrap gap-2"><ProposalStatus card={card} resolution={resolution} />{savedPreference && <Badge tone="green">Saved privately</Badge>}</div></div><ProposalDetails card={card} />
    {mealProposal && <div className="mt-4 grid gap-3 rounded-2xl bg-surface-muted p-4">
      <label className="grid gap-1 text-sm font-semibold" htmlFor={`servings-${card.proposal_id}`}>Servings
        <input id={`servings-${card.proposal_id}`} className="min-h-11 w-full rounded-control border border-line bg-white px-3 text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" type="number" min={1} max={100} step={1} inputMode="numeric" value={servingsText} onChange={(event) => setServingsText(event.target.value)} disabled={!canAct || actionBusy !== null} aria-describedby={`servings-note-${card.proposal_id}`} />
      </label>
      <label className="grid gap-1 text-sm font-semibold" htmlFor={`stage-${card.proposal_id}`}>Preparation stage
        <select id={`stage-${card.proposal_id}`} className="min-h-11 w-full rounded-control border border-line bg-white px-3 text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" value={preparationStage} onChange={(event) => setPreparationStage(event.target.value as PreparationStage)} disabled={!canAct || actionBusy !== null}>
          <option value="NOT_STARTED">Not started</option><option value="PARTLY_PREPARED">Partly prepared</option><option value="ALREADY_COOKED">Already cooked</option><option value="UNKNOWN">Unknown</option>
        </select>
      </label>
      <p id={`servings-note-${card.proposal_id}`} className="text-xs leading-relaxed text-muted">Servings must be 1–100. Any eligible ingredient amounts saved with this plan are estimates. When servings change before preparation, the API scales recognized, certain quantities from the saved plan; it never changes Kitchen stock. For a portion adjustment, the API also checks the saved plan version.</p>
      {card.type === "PortionAdjustment" && !mealReferenceValid && <p role="alert" className="text-sm text-danger">This adjustment is missing one trusted meal-plan reference or version. Approval is unavailable; ask for a fresh adjustment.</p>}
      <div className="flex flex-wrap gap-2">
        {mealApprovalAllowed && <Button disabled={!actionsEnabled || !canAct || actionBusy !== null || !mealReferenceValid || !servingsValid || editNeeded} aria-busy={actionBusy === `${card.proposal_id}:APPROVE`} onClick={() => onMealAction(card.proposal_id, card.version, "APPROVE", preparationStage, undefined, card.type === "PortionAdjustment" ? card.base_version : undefined)}>{actionBusy === `${card.proposal_id}:APPROVE` ? "Approving…" : "Approve proposal"}</Button>}
        {mealEditAllowed && <Button variant="secondary" disabled={!actionsEnabled || !canAct || actionBusy !== null || !mealReferenceValid || !servingsValid || !editNeeded} aria-busy={actionBusy === `${card.proposal_id}:EDIT`} onClick={() => onMealAction(card.proposal_id, card.version, "EDIT", preparationStage, servings, card.type === "PortionAdjustment" ? card.base_version : undefined)}>{actionBusy === `${card.proposal_id}:EDIT` ? "Saving edit…" : "Save servings and approve"}</Button>}
        {mealDismissAllowed && <Button variant="ghost" disabled={!actionsEnabled || !canAct || actionBusy !== null} aria-busy={actionBusy === `${card.proposal_id}:DISMISS`} onClick={() => onMealAction(card.proposal_id, card.version, "DISMISS", preparationStage, undefined, card.type === "PortionAdjustment" ? card.base_version : undefined)}>Dismiss proposal</Button>}
      </div>
      {!actionsEnabled && <p className="text-xs text-muted">Household changes are not enabled for this app yet.</p>}
    </div>}
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">{canAdd && <Button disabled={!canAct || actionBusy !== null} aria-busy={actionBusy === `${card.proposal_id}:ADD`} onClick={() => onAction(card.proposal_id, card.version, "ADD")}>{actionBusy === `${card.proposal_id}:ADD` ? "Adding…" : "Add to shopping list"}</Button>}{canSavePreference && <Button disabled={!canAct || actionBusy !== null || preferenceLoadState !== "ready"} aria-busy={consentBusy} onClick={() => { if (card.type === "PreferenceConsent") onConsent(card.proposal_id, card.proposed_text); }}>{consentBusy ? "Saving…" : preferenceLoadState === "loading" ? "Checking saved preferences…" : preferenceLoadState === "error" ? "Saved preferences unavailable" : preferenceErrors[card.proposal_id] ? "Retry saving preference" : "Save this preference"}</Button>}{!mealCard && !resolution && <Button disabled={!canAct || actionBusy !== null} aria-busy={actionBusy === `${card.proposal_id}:DISMISS`} onClick={() => onAction(card.proposal_id, card.version, "DISMISS")} variant="secondary">Dismiss</Button>}<p className="max-w-xl text-xs leading-relaxed text-muted">{savedPreference ? "Saved privately to your account with your explicit consent." : resolution?.status === "APPROVED" ? (resolution.plan_id ? `Meal plan saved for ${resolution.servings} ${resolution.servings === 1 ? "person" : "people"}. Kitchen stock was not changed.` : "A shopping list entry was recorded. Stock was not changed.") : resolution ? "This proposal is closed." : expired ? "Review current records before asking again." : !actionsEnabled ? "Household changes are not enabled for this app yet." : canAdd ? "Adding records a shopping plan only. It does not purchase or consume food." : card.type === "PreferenceConsent" ? "Saving is optional. Your click sends only the preference text to your private account preferences." : mealCard ? "Approval creates or revises a meal plan. It does not change Kitchen stock." : "This card is advice only; no record changes until an action is supported."}</p></div>{preferenceConflict && <p role="alert" className="mt-3 text-sm text-danger">{preferenceConflict} <ReviewLink href="/settings">Review preferences</ReviewLink></p>}{preferenceErrors[card.proposal_id] && !savedPreference && !preferenceConflict && <p role="alert" className="mt-3 text-sm text-danger">{preferenceErrors[card.proposal_id]} Retry uses the same request identity.</p>}</Card>;
}

export function AssistantCards({ envelope, rejectedCards = 0, ...actions }: { envelope: AssistantEnvelope; rejectedCards?: number } & ActionProps) {
  return <section aria-labelledby="proposal-heading" className="space-y-3"><Card className="border border-line p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><Heading id="proposal-heading" as="h2">Assistant proposals</Heading><Badge tone="green">Returned by household API</Badge></div><p className="mt-2 text-sm leading-relaxed">{envelope.message}</p><p className="mt-2 text-xs text-muted">Reviewing a proposal does not approve it or change records.</p></Card>
    {rejectedCards > 0 && <Card className="border border-tertiary/30 bg-tertiary-soft p-4" role="status"><p className="text-sm">{rejectedCards} unsupported or invalid {rejectedCards === 1 ? "card was" : "cards were"} safely omitted by the schema validator.</p></Card>}
    {envelope.cards.length === 0 ? <Card className="border border-line p-4" role="status"><p className="text-sm text-muted">The assistant returned no valid proposals.</p></Card> : <div className="grid gap-3 sm:grid-cols-2">{envelope.cards.map((card) => <TypedCard key={card.proposal_id} card={card} {...actions} />)}</div>}
  </section>;
}
