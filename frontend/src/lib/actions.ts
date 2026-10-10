"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { anonymousApi, api, SESSION_COOKIE, toProblem } from "./api/server";
import type { HumanDecision, PurchaseRequestDetail, Problem } from "./api/types";

export type LoginState = { error?: string } | undefined;

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const { data, response } = await anonymousApi().POST("/auth/login", { body: { email, password } });
  if (!data) {
    return { error: response.status === 401 ? "That email and password do not match an account." : "The server could not sign you in. Try again in a moment." };
  }

  (await cookies()).set(SESSION_COOKIE, data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: data.expiresIn,
  });
  // Only follow same-site paths, so a crafted ?next= cannot send people elsewhere.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/requests");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export type ActionResult = { ok: true; request?: PurchaseRequestDetail } | { ok: false; problem: Problem };

type DecisionInput = {
  requestId: string;
  /** Set when the request is in HUMAN_REVIEW: the decision goes to the review task (T9–T11). */
  reviewId?: number | null;
  decision: HumanDecision;
  version: number;
  comment?: string;
};

/** Records an approval, rejection or information request. The backend re-checks permission and state. */
export async function recordDecision(input: DecisionInput): Promise<ActionResult> {
  const client = await api();
  const comment = input.comment?.trim() || undefined;
  const id = input.requestId;

  const result = input.reviewId
    ? await client.POST("/reviews/{id}/decision", {
        params: { path: { id: input.reviewId } },
        body: { version: input.version, decision: input.decision, comment },
      })
    : input.decision === "APPROVE"
      ? await client.POST("/purchase-requests/{id}/approve", { params: { path: { id } }, body: { version: input.version, comment } })
      : input.decision === "REJECT"
        ? await client.POST("/purchase-requests/{id}/reject", { params: { path: { id } }, body: { version: input.version, comment: comment ?? "" } })
        : await client.POST("/purchase-requests/{id}/request-information", { params: { path: { id } }, body: { version: input.version, comment: comment ?? "" } });

  if (!result.data) return { ok: false, problem: toProblem(result.error, result.response) };
  refresh();
  return { ok: true, request: result.data };
}

/** Submits a draft, or resubmits after an information request (T1, T6). */
export async function submitRequest(requestId: string, version: number): Promise<ActionResult> {
  const client = await api();
  const result = await client.POST("/purchase-requests/{id}/submit", { params: { path: { id: requestId } }, body: { version } });
  if (!result.data) return { ok: false, problem: toProblem(result.error, result.response) };
  refresh();
  return { ok: true, request: result.data };
}

/** Retries purchase order generation after a failure (D14). */
export async function retryPurchaseOrder(requestId: string): Promise<ActionResult> {
  const client = await api();
  const result = await client.POST("/purchase-requests/{id}/purchase-order", { params: { path: { id: requestId } } });
  if (!result.data) return { ok: false, problem: toProblem(result.error, result.response) };
  refresh();
  return { ok: true };
}
