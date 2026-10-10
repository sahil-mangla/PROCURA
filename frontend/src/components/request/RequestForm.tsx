"use client";

import { startTransition, useActionState, useId, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { saveRequest } from "@/lib/actions";
import type { Category, Priority, Vendor } from "@/lib/api/types";
import { humanize, inr, categoryLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

const CATEGORIES: Category[] = ["IT_EQUIPMENT", "SOFTWARE", "OFFICE_FURNITURE", "OFFICE_SUPPLIES", "SERVICES", "TRAVEL", "MAINTENANCE", "OTHER"];
const PRIORITIES: Priority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

type Item = { description: string; quantity: string; unitPrice: string };
export type RequestFormValues = { id?: string; version?: number; title: string; description: string; category: string; priority: string; vendorId: string; neededBy: string; items: Item[] };

export const emptyValues: RequestFormValues = { title: "", description: "", category: "", priority: "NORMAL", vendorId: "", neededBy: "", items: [{ description: "", quantity: "1", unitPrice: "" }] };

const input = "w-full rounded-xl border bg-card/90 px-3 py-2 text-sm aria-[invalid=true]:border-destructive";

function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: React.ReactNode; htmlFor: string }) {
  return (
    <div className="text-sm">
      <label htmlFor={htmlFor} className="mb-1 block font-medium">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={`${htmlFor}-error`} className="mt-1 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

/** Create or edit a request. Items are plain strings until the server parses them; the backend computes the total. */
export function RequestForm({ initial, vendors }: { initial: RequestFormValues; vendors: Vendor[] }) {
  const [v, setV] = useState(initial);
  const [state, action, pending] = useActionState(saveRequest, undefined);
  const uid = useId();
  const id = (n: string) => `${uid}-${n}`;
  const err = state?.fieldErrors ?? {};
  const set = <K extends keyof RequestFormValues>(k: K, val: RequestFormValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const setItem = (i: number, patch: Partial<Item>) => setV((p) => ({ ...p, items: p.items.map((it, n) => (n === i ? { ...it, ...patch } : it)) }));

  const total = v.items.reduce((sum, it) => {
    const q = Number(it.quantity), u = Number(it.unitPrice);
    return sum + (Number.isFinite(q) && Number.isFinite(u) ? q * u : 0);
  }, 0);
  const selectedVendor = vendors.find((x) => String(x.id) === v.vendorId);
  const editing = !!initial.id;

  return (
    <form
      // Not `action={action}`: React resets a form after its action, which blanks the dropdowns while the
      // values are still in state. Calling the action ourselves keeps what the person entered on screen.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => action(data));
      }}
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6"
      noValidate
    >
      <input type="hidden" name="payload" value={JSON.stringify(v)} />

      {state?.message && (
        <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/8 px-4 py-3 text-sm text-destructive">{state.message}</p>
      )}

      <section className="rounded-2xl border border-border/70 bg-card/85 p-5 backdrop-blur-sm" aria-labelledby={id("details")}>
        <h2 id={id("details")} className="mb-4 text-base font-semibold">Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Title" htmlFor={id("title")} error={err.title}>
              <input id={id("title")} className={input} value={v.title} maxLength={200} aria-invalid={!!err.title} aria-describedby={err.title ? id("title-error") : undefined} onChange={(e) => set("title", e.target.value)} />
            </Field>
          </div>
          <Field label="Category" htmlFor={id("category")} error={err.category}>
            <select id={id("category")} className={input} value={v.category} aria-invalid={!!err.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">Choose…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
            </select>
          </Field>
          <Field label="Priority" htmlFor={id("priority")} error={err.priority}>
            <select id={id("priority")} className={input} value={v.priority} onChange={(e) => set("priority", e.target.value)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{humanize(p)}</option>)}
            </select>
          </Field>
          <Field label="Vendor" htmlFor={id("vendor")} error={err.vendorId} hint={selectedVendor && selectedVendor.completedOrders === 0 ? "New vendor with no prior orders. The AI will flag this and a person may review the request." : undefined}>
            <select id={id("vendor")} className={input} value={v.vendorId} aria-invalid={!!err.vendorId} onChange={(e) => set("vendorId", e.target.value)}>
              <option value="">Choose…</option>
              {vendors.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </Field>
          <Field label="Needed by (optional)" htmlFor={id("needed")} error={err.neededBy}>
            <input id={id("needed")} type="date" className={input} value={v.neededBy} onChange={(e) => set("neededBy", e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description (optional)" htmlFor={id("desc")} hint="What is it for? Approvers and the AI both read this.">
              <textarea id={id("desc")} rows={3} maxLength={4000} className={cn(input, "resize-y")} value={v.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/85 p-5 backdrop-blur-sm" aria-labelledby={id("items")}>
        <h2 id={id("items")} className="mb-4 text-base font-semibold">Items</h2>
        {err.items && <p className="mb-3 text-xs font-medium text-destructive">{err.items}</p>}
        <ul className="space-y-4">
          {v.items.map((it, i) => (
            <li key={i} className="grid grid-cols-[1fr_5rem_8rem_auto] items-start gap-2 max-sm:grid-cols-2">
              <div className="max-sm:col-span-2">
                <Field label={i === 0 ? "Item" : `Item ${i + 1}`} htmlFor={id(`d${i}`)} error={err[`items[${i}].description`]}>
                  <input id={id(`d${i}`)} className={input} value={it.description} maxLength={300} aria-invalid={!!err[`items[${i}].description`]} onChange={(e) => setItem(i, { description: e.target.value })} />
                </Field>
              </div>
              <Field label="Qty" htmlFor={id(`q${i}`)} error={err[`items[${i}].quantity`]}>
                <input id={id(`q${i}`)} inputMode="numeric" className={cn(input, "tnum")} value={it.quantity} aria-invalid={!!err[`items[${i}].quantity`]} onChange={(e) => setItem(i, { quantity: e.target.value })} />
              </Field>
              <Field label="Unit price (₹)" htmlFor={id(`u${i}`)} error={err[`items[${i}].unitPrice`]}>
                <input id={id(`u${i}`)} inputMode="decimal" className={cn(input, "tnum")} value={it.unitPrice} aria-invalid={!!err[`items[${i}].unitPrice`]} onChange={(e) => setItem(i, { unitPrice: e.target.value })} />
              </Field>
              <button type="button" disabled={v.items.length === 1} onClick={() => setV((p) => ({ ...p, items: p.items.filter((_, n) => n !== i) }))} aria-label={`Remove item ${i + 1}`}
                className="mt-6 grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-destructive disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground max-sm:mt-6 max-sm:justify-self-end">
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <button type="button" onClick={() => setV((p) => ({ ...p, items: [...p.items, { description: "", quantity: "1", unitPrice: "" }] }))} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1.5 text-sm font-medium">
            <Plus className="size-4" aria-hidden /> Add item
          </button>
          <p className="text-sm"><span className="text-muted-foreground">Total </span><span className="text-lg font-semibold tnum">{inr(total)}</span></p>
        </div>
        <p className="mt-1 text-right text-xs text-muted-foreground">The server recalculates the total when it saves.</p>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href={editing ? `/requests/${encodeURIComponent(initial.id!)}` : "/requests"} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</Link>
        <button type="submit" name="intent" value="save" disabled={pending} className="rounded-full border border-border bg-card/70 px-4 py-2.5 text-sm font-semibold disabled:opacity-60">
          {pending ? "Saving…" : "Save draft"}
        </button>
        <button type="submit" name="intent" value="submit" disabled={pending} className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {pending ? "Working…" : "Submit for approval"}
        </button>
      </div>
    </form>
  );
}
