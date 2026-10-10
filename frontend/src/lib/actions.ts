"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { anonymousApi, api, SESSION_COOKIE, toProblem } from "./api/server";
import type { Category, HumanDecision, PurchaseRequestDetail, PurchaseRequestInput, Priority, Problem } from "./api/types";

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

export type FormState = { message?: string; fieldErrors?: Record<string, string> } | undefined;

const CATEGORIES: Category[] = ["IT_EQUIPMENT", "SOFTWARE", "OFFICE_FURNITURE", "OFFICE_SUPPLIES", "SERVICES", "TRAVEL", "MAINTENANCE", "OTHER"];
const PRIORITIES: Priority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

type Payload = { id?: string; version?: number; title: string; description: string; category: string; priority: string; vendorId: string; neededBy: string; items: { description: string; quantity: string; unitPrice: string }[] };

/** Checks the form on the server too; the backend then validates again and is the final word. */
function parsePayload(raw: string): { input?: PurchaseRequestInput; errors: Record<string, string>; payload?: Payload } {
  let payload: Payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { errors: { _: "The form could not be read. Reload the page and try again." } };
  }
  const errors: Record<string, string> = {};
  const title = payload.title?.trim() ?? "";
  if (!title) errors.title = "Enter a title.";
  if (!CATEGORIES.includes(payload.category as Category)) errors.category = "Choose a category.";
  if (!PRIORITIES.includes(payload.priority as Priority)) errors.priority = "Choose a priority.";
  const vendorId = Number(payload.vendorId);
  if (!Number.isInteger(vendorId) || vendorId <= 0) errors.vendorId = "Choose a vendor.";
  if (!Array.isArray(payload.items) || payload.items.length === 0) errors.items = "Add at least one item.";
  const items = (payload.items ?? []).map((it, i) => {
    const quantity = Number(it.quantity);
    const unitPrice = Number(it.unitPrice);
    if (!it.description?.trim()) errors[`items[${i}].description`] = "Describe the item.";
    if (!Number.isInteger(quantity) || quantity < 1) errors[`items[${i}].quantity`] = "Enter a whole number, 1 or more.";
    if (!Number.isFinite(unitPrice) || unitPrice < 0 || Math.abs(unitPrice * 100 - Math.round(unitPrice * 100)) > 1e-6) errors[`items[${i}].unitPrice`] = "Enter an amount in rupees, with at most 2 decimals.";
    return { description: it.description?.trim() ?? "", quantity, unitPrice };
  });
  if (Object.keys(errors).length) return { errors, payload };
  return {
    errors,
    payload,
    input: {
      title,
      description: payload.description?.trim() || undefined,
      category: payload.category as Category,
      priority: payload.priority as Priority,
      vendorId,
      neededBy: payload.neededBy || undefined,
      items,
    },
  };
}

/** Creates a draft, or saves changes to one (DRAFT or INFO_REQUESTED). With intent=submit it then submits it. */
export async function saveRequest(_prev: FormState, form: FormData): Promise<FormState> {
  const { input, errors, payload } = parsePayload(String(form.get("payload") ?? ""));
  if (!input || !payload) return { message: errors._ ?? "Fix the highlighted fields and try again.", fieldErrors: errors };

  const client = await api();
  const saved = payload.id
    ? await client.PUT("/purchase-requests/{id}", { params: { path: { id: payload.id } }, body: { ...input, version: payload.version ?? 0 } })
    : await client.POST("/purchase-requests", { body: input });
  if (!saved.data) return problemToState(toProblem(saved.error, saved.response));

  let target = saved.data;
  if (form.get("intent") === "submit") {
    const submitted = await client.POST("/purchase-requests/{id}/submit", { params: { path: { id: target.id } }, body: { version: target.version } });
    if (!submitted.data) {
      // The draft is saved, so go to it and say what happened rather than losing the work.
      const p = toProblem(submitted.error, submitted.response);
      redirect(`/requests/${encodeURIComponent(target.id)}?notice=${encodeURIComponent("Saved as a draft, but it could not be submitted: " + (p.detail ?? p.title))}`);
    }
    target = submitted.data;
  }
  refresh();
  redirect(`/requests/${encodeURIComponent(target.id)}`);
}

function problemToState(p: Problem): FormState {
  const fieldErrors: Record<string, string> = {};
  for (const e of p.errors ?? []) fieldErrors[e.field] = e.message;
  switch (p.code) {
    case "VALIDATION_FAILED": return { message: "Fix the highlighted fields and try again.", fieldErrors };
    case "WORKFLOW_CONFLICT": return { message: "Someone changed this request while you were editing. Reload the page to see the latest version, then re-apply your changes." };
    case "INVALID_TRANSITION":
    case "FORBIDDEN": return { message: "This request can no longer be edited by you. It may have been submitted." };
    case "UNAUTHENTICATED": return { message: "Your session has ended. Sign in again; your entries on this page are kept until you leave it." };
    default: return { message: "The server could not save this. Nothing was changed. Try again in a moment." };
  }
}
