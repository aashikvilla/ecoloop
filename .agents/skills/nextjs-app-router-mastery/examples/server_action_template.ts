"use server";

import { revalidatePath } from "next/cache";

export interface DecisionApprovalResponse {
  success: boolean;
  actionId?: string;
  error?: string;
}

export async function approveProposalAction(proposalId: string): Promise<DecisionApprovalResponse> {
  if (!proposalId) {
    return { success: false, error: "Missing proposal ID" };
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    const res = await fetch(`${backendUrl}/api/v1/actions/${proposalId}/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        approved_by: "household_cook_01",
        confirmed_at: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.detail || "Approval failed" };
    }

    const data = await res.json();
    revalidatePath("/dashboard");
    return { success: true, actionId: data.action_id };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
