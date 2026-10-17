"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";

type InstallChoice = { outcome: "accepted" | "dismissed"; platform: string };
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};
type InstallState = "checking" | "available" | "browser-menu" | "installed";

function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in window.navigator && window.navigator.standalone === true);
}

export function PwaReadiness() {
  const [installState, setInstallState] = useState<InstallState>("checking");
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    const updateInstallState = () => {
      if (active && isInstalled()) {
        setInstallState("installed");
        setInstallPrompt(null);
      }
    };
    const handleInstallAvailable = (event: Event) => {
      event.preventDefault();
      if (!active || isInstalled()) return;
      setInstallPrompt(event as InstallPrompt);
      setInstallState("available");
    };
    const handleInstalled = () => {
      if (!active) return;
      setInstallPrompt(null);
      setInstallState("installed");
      setNotice("EcoLoop is installed on this device.");
    };

    const installStateCheck = window.requestAnimationFrame(updateInstallState);
    window.addEventListener("beforeinstallprompt", handleInstallAvailable);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      active = false;
      window.cancelAnimationFrame(installStateCheck);
      window.removeEventListener("beforeinstallprompt", handleInstallAvailable);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    const prompt = installPrompt;
    setInstallPrompt(null);
    setInstallState("browser-menu");
    setNotice("");
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") setNotice("Finish installing EcoLoop in your browser prompt.");
    } catch {
      setNotice("The install prompt could not be opened. Try your browser’s Install app menu option.");
    }
  }

  return <>
    <Card className="space-y-4 border border-line p-5 sm:p-6">
      <div>
        <Heading as="h2">Install EcoLoop</Heading>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Add EcoLoop to this device for an app-style window. Installation availability depends on your browser.
        </p>
      </div>
      {installState === "installed" ? <p role="status" className="text-sm font-medium text-primary">EcoLoop is open as an installed app.</p>
        : installState === "available" ? <Button onClick={() => void install()}>Install EcoLoop</Button>
          : <p className="text-sm text-muted">If your browser offers “Install app” or “Add to Home Screen” in its menu, you can install EcoLoop there.</p>}
      {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
    </Card>

    <Card className="space-y-3 border border-line p-5 sm:p-6">
      <div>
        <Heading as="h2">Reminder delivery</Heading>
        <p className="mt-2 text-sm font-semibold text-secondary">Push and email reminders are unavailable</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Confirmed Kitchen dates and last-check prompts can appear in Home and Kitchen while EcoLoop is open. Background delivery is not configured, so installing the app or allowing browser notifications will not send reminders.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          A recorded date is a prompt to check the food yourself; it does not assess its condition or safety.
        </p>
      </div>
    </Card>
  </>;
}
