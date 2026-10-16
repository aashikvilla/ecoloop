"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { useDemo } from "@/lib/demo-store";

export default function SettingsPage() {
  const { preferences, savePreference, deletePreference, resetDemo, persistenceError, hydrated } = useDemo();
  const [draft, setDraft] = useState("");
  const [consented, setConsented] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const resetDialog = useRef<HTMLDialogElement>(null);
  const resetTrigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = resetDialog.current;
    if (!dialog) return;
    if (resetOpen && !dialog.open) dialog.showModal();
    else if (!resetOpen && dialog.open) dialog.close();
  }, [resetOpen]);

  function submitPreference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setFeedback("");
    if (!consented) { setError("Check the box to confirm you want this phrase saved in the local demo."); return; }
    try {
      savePreference(draft);
      if (editingId) deletePreference(editingId);
      setDraft(""); setConsented(false); setEditingId(null);
      setFeedback("Preference saved in this browser demo.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "This preference could not be saved."); }
  }

  function startEdit(id: string, text: string) { setEditingId(id); setDraft(text); setConsented(false); setError(""); setFeedback(""); }
  function removePreference(id: string) {
    if (!window.confirm("Delete this saved preference from this browser’s demo?")) return;
    deletePreference(id);
    if (editingId === id) { setEditingId(null); setDraft(""); }
    setFeedback("Preference deleted from this browser demo.");
  }

  if (!hydrated) return <div role="status" aria-label="Loading browser demo preferences" className="mx-auto max-w-3xl space-y-4"><div className="h-8 w-2/3 animate-pulse rounded-xl bg-surface-muted"/><div className="h-56 animate-pulse rounded-card bg-surface-muted"/></div>;

  return <div className="mx-auto max-w-3xl space-y-7">
    <header><Badge tone="amber" className="mb-3">LOCAL DEMO SETTINGS</Badge><Heading as="h1">Your preferences, your choice</Heading><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Save a short phrase to make this demo feel more personal. Nothing is sent to an AI service or managed memory.</p></header>

    <Card className="border border-line p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary"><Icon name="ask" size={21}/></span><div><Heading as="h2">A preference for this demo</Heading><p className="mt-1 text-sm text-muted">For example: “I prefer vegetarian weeknight meals.”</p></div></div>
      <form onSubmit={submitPreference} className="space-y-4">
        <label htmlFor="preference" className="block text-sm font-bold text-foreground">Preference text</label>
        <Input id="preference" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={280} placeholder="Write a preference you want to remember" required aria-describedby="preference-help preference-count"/>
        <div className="flex justify-between text-xs text-muted"><span id="preference-help">Up to 280 characters</span><span id="preference-count">{draft.length}/280</span></div>
        <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl bg-surface-muted p-3 text-sm leading-relaxed text-foreground"><input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} className="mt-1 size-5 shrink-0 accent-primary"/><span>I want to save this phrase in this browser’s demo data.</span></label>
        {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}{feedback && <p role="status" className="text-sm font-semibold text-primary">{feedback}</p>}
        <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!draft.trim()}>{editingId ? "Save edit" : "Save preference"}</Button>{editingId && <Button variant="ghost" onClick={() => { setEditingId(null); setDraft(""); setConsented(false); }}>Cancel edit</Button>}</div>
      </form>
    </Card>

    <section aria-labelledby="saved-preferences-title"><div className="mb-3 flex items-center justify-between"><Heading id="saved-preferences-title" as="h2">Saved here</Heading><Badge>{preferences.length} {preferences.length === 1 ? "preference" : "preferences"}</Badge></div>
      {preferences.length === 0 ? <Card className="border border-dashed border-line bg-transparent px-5 py-8 text-center shadow-none"><p className="font-semibold text-primary">No saved preferences</p><p className="mt-1 text-sm text-muted">The demo starts with this list empty.</p></Card> : <ul className="space-y-3">{preferences.map((preference) => <li key={preference.id}><Card className="flex flex-col gap-3 border border-line p-4 sm:flex-row sm:items-center sm:justify-between"><p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">{preference.text}</p><div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => startEdit(preference.id, preference.text)}><Icon name="edit" size={16}/>Edit</Button><Button size="sm" variant="danger" onClick={() => removePreference(preference.id)}><Icon name="trash" size={16}/>Delete</Button></div></Card></li>)}</ul>}
    </section>

    <Card className="border border-line p-5 sm:p-6"><div className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary-soft text-secondary"><Icon name="info" size={21}/></span><div><Heading as="h2">Reset demo data</Heading><p className="mt-1 text-sm leading-relaxed text-muted">Remove this browser’s items, shopping list, activity, preferences, meal plan, and share notes, then restore the sample kitchen.</p>{persistenceError && <p role="status" className="mt-2 text-xs text-secondary">{persistenceError}</p>}<Button ref={resetTrigger} variant="danger" className="mt-4" onClick={() => setResetOpen(true)}>Reset this demo</Button></div></div></Card>

    <dialog ref={resetDialog} role="alertdialog" aria-labelledby="reset-title" aria-describedby="reset-description" className="fixed inset-0 z-50 m-0 h-full max-h-none w-full max-w-none overflow-visible bg-transparent p-4 backdrop:bg-primary/35" onClose={() => { setResetOpen(false); resetTrigger.current?.focus(); }} onClick={(event) => { if (event.target === resetDialog.current) setResetOpen(false); }}>
      <section className="absolute inset-0 m-auto flex max-h-fit w-[calc(100%-2rem)] max-w-md flex-col rounded-card bg-white p-6 shadow-2xl"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-danger-soft text-danger"><Icon name="trash" size={22}/></span><Heading id="reset-title" as="h2" className="mt-4">Reset this browser demo?</Heading><p id="reset-description" className="mt-2 text-sm leading-relaxed text-muted">This clears your local items, shopping list, activity, preferences, meal plan, and share notes. The sample kitchen will be restored. This cannot be undone.</p><div className="mt-6 flex flex-wrap justify-end gap-2"><Button variant="secondary" onClick={() => setResetOpen(false)}>Keep my data</Button><Button variant="danger" onClick={() => { resetDemo(); setResetOpen(false); setDraft(""); setConsented(false); setEditingId(null); setFeedback("Demo data has been reset in this browser."); }}>Reset data</Button></div></section>
    </dialog>
  </div>;
}
