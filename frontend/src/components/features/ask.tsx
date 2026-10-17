"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useLiveHousehold } from "@/lib/live-household";
import { CanonicalApiError } from "@/lib/canonical-transport";
import type { AssistantEnvelope } from "@/lib/assistant-cards";
import { readAssistantHistory, requestDurableTurn, submitProposalAction, type ProposalResolution } from "@/lib/assistant-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { LiveDestinationNotice } from "@/components/account/live-destination";
import { AssistantCards } from "./assistant-cards";

type Message = { id: string; role: "user" | "assistant"; text: string };
function readError(error: unknown) { return error instanceof CanonicalApiError ? error.message : "The household assistant could not be reached. Try again."; }

export function AskAssistant() {
  const { user, householdId, auth } = useLiveHousehold();
  return <ScopedAskAssistant key={JSON.stringify([auth, user?.uid ?? null, householdId])} />;
}

function ScopedAskAssistant() {
  const { user, householdId, auth } = useLiveHousehold();
  const params = useSearchParams();
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
  const [historyPhase, setHistoryPhase] = useState<"loading" | "ready" | "error">("loading");
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const actionKeys = useRef<Record<string, string>>({});
  const historyController = useRef<AbortController | null>(null);
  const requestController = useRef<AbortController | null>(null);
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
  function submit(event: FormEvent) { event.preventDefault(); void send(prompt); }
  return <div className="mx-auto max-w-4xl space-y-5 px-4 pb-12 pt-6 sm:px-6 lg:pt-10">
    <header><p className="text-xs font-bold uppercase tracking-wide text-muted">Ask</p><Heading as="h1" className="mt-1">Cook thoughtfully</Heading><p className="mt-2 text-sm leading-relaxed text-muted">Ask for suggestions based on your household records. Review every proposal before taking action.</p></header>
    <LiveDestinationNotice />
    <Card className="space-y-4 border border-line p-4 sm:p-5"><div><Heading as="h2">Conversation</Heading><p className="mt-1 text-sm text-muted">Requests and proposals are saved privately for your account. Review a suggestion before taking action.</p></div>{auth === "signed-in" && historyPhase === "loading" && <p role="status" className="text-sm text-muted">Loading recent conversation…</p>}{historyPhase === "error" && <p role="status" className="text-sm text-muted">Recent conversation could not be loaded. You can still ask a new question.</p>}<div aria-live="polite" className="space-y-3">{messages.slice(-8).map((entry) => <div key={entry.id} className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-5 ${entry.role === "user" ? "ml-auto bg-primary text-white" : "bg-surface-muted text-foreground"}`}><p>{entry.text}</p></div>)}</div>
      <div className="flex flex-wrap gap-2">{["What can I make tonight?", "Should I buy tomatoes?", "Use what I have for lunch"].map((value) => <button type="button" key={value} onClick={() => void send(value)} disabled={busy || actionBusy !== null} className="min-h-11 rounded-full bg-surface-muted px-4 text-sm text-primary disabled:opacity-50">{value}</button>)}</div>
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={submit}><label htmlFor="ask-prompt" className="sr-only">Ask a question</label><Input id="ask-prompt" className="flex-1" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask about a meal or what to buy" maxLength={8000} /><Button type="submit" disabled={busy || actionBusy !== null || !prompt.trim()} aria-busy={busy}>{busy ? "Asking…" : "Send"}</Button></form>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}{notice && <p role="status" className="text-sm text-muted">{notice}</p>}
    </Card>
    {assistantResponse && <AssistantCards envelope={assistantResponse} rejectedCards={rejectedCards} resolutions={resolutions} onAction={act} actionBusy={actionBusy} actionsEnabled={process.env.NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS === "true"} />}
  </div>;
}
