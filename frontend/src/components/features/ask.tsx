"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useLiveHousehold } from "@/lib/live-household";
import { CanonicalApiError } from "@/lib/canonical-transport";
import type { AssistantEnvelope } from "@/lib/assistant-cards";
import { readAssistantHistory, readSavedPreferences, requestDurableTurn, saveProposedPreference, submitMealProposalAction, submitProposalAction, type PreparationStage, type ProposalResolution, type SavedPreference } from "@/lib/assistant-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { LiveDestinationNotice } from "@/components/account/live-destination";
import { AssistantCards } from "./assistant-cards";

type Message = { id: string; role: "user" | "assistant"; text: string };
function readError(error: unknown) { return error instanceof CanonicalApiError ? error.message : "The household assistant could not be reached. Try again."; }
const askIntents: Record<string, string> = {
  meal: "What can I make with my confirmed kitchen records?",
  "buy-check": "Check whether I should buy something against my current confirmed kitchen records. Ask me which item if you need one.",
};

export function AskAssistant() {
  const { user, householdId, auth } = useLiveHousehold();
  return <ScopedAskAssistant key={JSON.stringify([auth, user?.uid ?? null, householdId])} />;
}

function ScopedAskAssistant() {
  const { user, householdId, auth } = useLiveHousehold();
  const params = useSearchParams();
  const intent = params.get("intent");
  const itemId = params.get("item");
  const [messages, setMessages] = useState<Message[]>([{ id: "welcome", role: "assistant", text: "Ask about your household food records. Review suggestions before taking any action." }]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [assistantResponse, setAssistantResponse] = useState<AssistantEnvelope | null>(null);
  const [rejectedCards, setRejectedCards] = useState(0);
  const [resolutions, setResolutions] = useState<Record<string, ProposalResolution>>({});
  const [privatePreferences, setPrivatePreferences] = useState<SavedPreference[]>([]);
  const [preferenceLoadState, setPreferenceLoadState] = useState<"idle" | "loading" | "ready" | "error">(auth === "signed-in" ? "loading" : "idle");
  const [preferenceReload, setPreferenceReload] = useState(0);
  const [preferenceErrors, setPreferenceErrors] = useState<Record<string, string>>({});
  const [historyPhase, setHistoryPhase] = useState<"loading" | "ready" | "error">("loading");
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const actionKeys = useRef<Record<string, string>>({});
  const historyController = useRef<AbortController | null>(null);
  const requestController = useRef<AbortController | null>(null);
  const readyToAsk = auth === "signed-in" && Boolean(user) && Boolean(householdId);
  useEffect(() => {
    if (intent === "meal" && itemId && /^[A-Za-z0-9._:-]{1,128}$/.test(itemId)) {
      setPrompt("Prioritize the selected Kitchen item in a meal suggestion. Use confirmed foods from my Kitchen, link available items by their actual record IDs, and clearly identify any ingredients that are not confirmed in my Kitchen.");
    } else if (intent && askIntents[intent]) setPrompt(askIntents[intent]);
  }, [intent, itemId]);
  useEffect(() => {
    const controller = new AbortController();
    historyController.current = controller;
    if (auth !== "signed-in" || !user || !householdId) return () => controller.abort();
    void (async () => {
      try {
        const token = await user.getIdToken();
        const turns = await readAssistantHistory(token, householdId, controller.signal);
        if (controller.signal.aborted) return;
        if (turns.length) {
          const latest = turns[0];
          const ordered = [...turns].reverse();
          setMessages(ordered.flatMap((turn) => [
            { id: `${turn.turn_id}-user`, role: "user" as const, text: turn.user_text },
            { id: `${turn.turn_id}-assistant`, role: "assistant" as const, text: turn.envelope.message },
          ]));
          setAssistantResponse(latest.envelope);
          setResolutions(latest.resolutions);
          setSessionId(latest.envelope.session_id);
        }
        setHistoryPhase("ready");
      } catch {
        if (!controller.signal.aborted) setHistoryPhase("error");
      }
    })();
    return () => { controller.abort(); requestController.current?.abort(); };
  }, [auth, user, householdId]);
  useEffect(() => {
    const controller = new AbortController();
    if (auth !== "signed-in" || !user) {
      setPrivatePreferences([]);
      setPreferenceLoadState("idle");
      return () => controller.abort();
    }
    setPreferenceLoadState("loading");
    void (async () => {
      try {
        const token = await user.getIdToken();
        if (controller.signal.aborted) return;
        const records = await readSavedPreferences(token, controller.signal);
        if (controller.signal.aborted) return;
        setPrivatePreferences(records);
        setPreferenceLoadState("ready");
      } catch {
        if (!controller.signal.aborted) setPreferenceLoadState("error");
      }
    })();
    return () => controller.abort();
  }, [auth, user, preferenceReload]);
  async function send(text: string) {
    const value = text.trim();
    if (!value || busy || actionBusy) return;
    historyController.current?.abort();
    setHistoryPhase("ready");
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text: value }]);
    setPrompt(""); setError(""); setNotice(""); setAssistantResponse(null); setRejectedCards(0);
    setResolutions({});
    if (auth !== "signed-in" || !user || !householdId) { setError("Sign in and choose a household before asking about its records."); return; }
    setBusy(true);
    const controller = new AbortController();
    requestController.current = controller;
    try {
      const token = await user.getIdToken();
      const { envelope: result, rejectedCards } = await requestDurableTurn(token, householdId, { schema_version: 1, text: value, session_id: sessionId, context_item_ids: itemId && /^[A-Za-z0-9._:-]{1,128}$/.test(itemId) ? [itemId] : [] }, controller.signal);
      setSessionId(result.session_id);
      setAssistantResponse(result);
      setRejectedCards(rejectedCards);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", text: result.message }]);
      setNotice(result.cards.length ? "Proposals saved for review. Only an explicit action can update the shopping list." : "The assistant returned no proposal cards.");
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(caught instanceof CanonicalApiError && caught.code === "unavailable" ? "The household assistant is temporarily unavailable. Try again later." : readError(caught));
    } finally { if (requestController.current === controller) requestController.current = null; setBusy(false); }
  }
  async function act(proposalId: string, version: number, action: "ADD" | "DISMISS") {
    if (!user || !householdId || actionBusy) return;
    const key = `${proposalId}:${action}`;
    actionKeys.current[key] ??= crypto.randomUUID();
    const controller = new AbortController();
    requestController.current = controller;
    setActionBusy(key); setError(""); setNotice("");
    try {
      const token = await user.getIdToken();
      const resolution = await submitProposalAction(token, householdId, proposalId, version, action, actionKeys.current[key], controller.signal);
      setResolutions((current) => ({ ...current, [proposalId]: resolution }));
      delete actionKeys.current[key];
      setNotice(action === "ADD" ? "Added to your shopping list. No purchase or stock change was recorded." : "Proposal dismissed.");
    } catch (caught) {
      if (!controller.signal.aborted) setError(readError(caught));
    } finally {
      if (requestController.current === controller) requestController.current = null;
      setActionBusy(null);
    }
  }
  async function actMeal(proposalId: string, version: number, action: "APPROVE" | "EDIT" | "DISMISS", preparationStage: PreparationStage, proposedServings?: number, planBaseVersion?: number) {
    if (!user || !householdId || actionBusy) return;
    const key = `${proposalId}:${action}:${preparationStage}:${proposedServings ?? "-"}:${planBaseVersion ?? "-"}`;
    actionKeys.current[key] ??= crypto.randomUUID();
    const controller = new AbortController();
    requestController.current = controller;
    setActionBusy(`${proposalId}:${action}`); setError(""); setNotice("");
    try {
      const token = await user.getIdToken();
      const resolution = await submitMealProposalAction(token, householdId, proposalId, version, action, preparationStage, actionKeys.current[key], controller.signal, { proposedServings, planBaseVersion });
      setResolutions((current) => ({ ...current, [proposalId]: resolution }));
      setNotice(action === "DISMISS" ? "Meal proposal dismissed." : `Meal plan saved for ${resolution.servings} ${resolution.servings === 1 ? "person" : "people"}. Kitchen stock was not changed.`);
    } catch (caught) {
      if (!controller.signal.aborted) setError(readError(caught));
    } finally {
      if (requestController.current === controller) requestController.current = null;
      setActionBusy(null);
    }
  }
  async function consentToPreference(proposalId: string, proposedText: string) {
    if (!user || actionBusy) return;
    actionKeys.current[`${proposalId}:CONSENT`] ??= crypto.randomUUID();
    const key = `${proposalId}:CONSENT`;
    const controller = new AbortController();
    requestController.current = controller;
    setActionBusy(key);
    setPreferenceErrors((current) => { const next = { ...current }; delete next[proposalId]; return next; });
    setError(""); setNotice("");
    try {
      const token = await user.getIdToken();
      const saved = await saveProposedPreference(token, proposalId, proposedText, actionKeys.current[key], controller.signal);
      if (controller.signal.aborted) return;
      setPrivatePreferences((current) => [saved, ...current.filter((record) => record.preference_id !== proposalId)]);
      delete actionKeys.current[key];
      setNotice("Preference saved privately to your account with your explicit consent.");
    } catch (caught) {
      if (!controller.signal.aborted) {
        setPreferenceErrors((current) => ({ ...current, [proposalId]: readError(caught) }));
        if (caught instanceof CanonicalApiError && caught.code === "conflict") setPreferenceReload((current) => current + 1);
      }
    } finally {
      if (requestController.current === controller) requestController.current = null;
      setActionBusy(null);
    }
  }
  function submit(event: FormEvent) { event.preventDefault(); void send(prompt); }
  return <div className="mx-auto max-w-4xl space-y-5 px-4 pb-12 pt-6 sm:px-6 lg:pt-10">
    <header><p className="text-xs font-bold uppercase tracking-wide text-muted">Ask</p><Heading as="h1" className="mt-1">Cook thoughtfully</Heading><p className="mt-2 text-sm leading-relaxed text-muted">Ask for suggestions based on your household records. Review every proposal before taking action.</p></header>
    <LiveDestinationNotice />
    <Card className="space-y-4 border border-line p-4 sm:p-5"><div><Heading as="h2">Conversation</Heading><p className="mt-1 text-sm text-muted">Requests and proposals are saved privately for your account. Review a suggestion before taking action.</p></div>{auth === "signed-in" && historyPhase === "loading" && <p role="status" className="text-sm text-muted">Loading recent conversation…</p>}{historyPhase === "error" && <p role="status" className="text-sm text-muted">Recent conversation could not be loaded. You can still ask a new question.</p>}<div aria-live="polite" className="space-y-3">{messages.slice(-8).map((entry) => <div key={entry.id} className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-5 ${entry.role === "user" ? "ml-auto bg-primary text-white" : "bg-surface-muted text-foreground"}`}><p>{entry.text}</p></div>)}</div>
      <div className="flex flex-wrap gap-2">{["What can I make tonight?", "Should I buy tomatoes?", "Use what I have for lunch"].map((value) => <button type="button" key={value} onClick={() => void send(value)} disabled={!readyToAsk || busy || actionBusy !== null} className="min-h-11 rounded-full bg-surface-muted px-4 text-sm text-primary disabled:opacity-50">{value}</button>)}</div>
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={submit}><label htmlFor="ask-prompt" className="sr-only">Ask a question</label><Input id="ask-prompt" className="flex-1" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask about a meal or what to buy" maxLength={8000} disabled={!readyToAsk || busy} /><Button type="submit" disabled={!readyToAsk || busy || actionBusy !== null || !prompt.trim()} aria-busy={busy}>{busy ? "Asking…" : "Send"}</Button></form>
      {auth === "signed-in" && !householdId && <p className="text-sm text-muted">Choose an active household above to ask about its confirmed records.</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}{notice && <p role="status" className="text-sm text-muted">{notice}</p>}
    </Card>
    {auth === "signed-in" && preferenceLoadState === "loading" && <p role="status" className="text-sm text-muted">Checking private saved preferences…</p>}
    {auth === "signed-in" && preferenceLoadState === "error" && <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-danger"><span>Saved preferences could not be checked, so preference cards are unavailable until they can be checked.</span><Button variant="secondary" onClick={() => setPreferenceReload((current) => current + 1)}>Retry checking preferences</Button></div>}
    {assistantResponse && <AssistantCards envelope={assistantResponse} rejectedCards={rejectedCards} contextItemId={itemId} resolutions={resolutions} privatePreferences={privatePreferences} preferenceLoadState={preferenceLoadState} preferenceErrors={preferenceErrors} onAction={act} onMealAction={actMeal} onConsent={consentToPreference} actionBusy={actionBusy} actionsEnabled={process.env.NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS === "true"} />}
  </div>;
}
