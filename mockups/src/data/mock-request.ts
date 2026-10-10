// MOCK DATA for design mockups only. Shapes mirror spec section 12; the real contract is owned by the backend agent.

export type Recommendation = "APPROVE" | "REJECT";
export type Risk = "LOW" | "MEDIUM" | "HIGH";
export type StepState = "done" | "current" | "pending";

export type Reason = { text: string; tone: "supports" | "concern" };
export type Evidence = {
  id: string;
  summary: string;
  amount: number;
  outcome: "APPROVED" | "REJECTED";
  similarity: number;
};
export type HistoryEntry = {
  id: string;
  actor: string;
  role: "Requester" | "AI" | "Department Head" | "Finance Manager" | "System";
  action: string;
  at: string;
  comment?: string;
  /** Set on the human decision entry so the UI can show AI-vs-human disagreement. */
  decision?: Recommendation | "REQUEST_INFO";
};
export type WorkflowStep = { id: string; label: string; state: StepState; actor?: string; at?: string };

export const REQUEST = {
  id: "PR-1042",
  title: "Ergonomic task chairs for the Bengaluru design studio",
  requester: { name: "Meera Iyer", role: "Studio Operations Lead" },
  department: "Design Operations",
  category: "Office furniture",
  amount: 184000,
  vendor: { name: "Northwind Furnishings", isNew: true, priorOrders: 0 },
  description:
    "Replace 24 failed task chairs after the studio grew by 8 people this quarter. Quote valid until 30 Oct, delivery and assembly included.",
  submittedAt: "2026-10-06T10:12:00+05:30",
  items: [
    { name: "Ergonomic task chair, mesh back", qty: 24, unit: 7000 },
    { name: "Delivery and assembly", qty: 1, unit: 16000 },
  ],
} as const;

export const BUDGET = {
  departmentBudget: 2_400_000,
  spent: 1_730_000,
  thisRequest: REQUEST.amount,
} as const;

export const AI = {
  recommendation: "APPROVE" as Recommendation,
  confidence: 67,
  risk: "MEDIUM" as Risk,
  reviewThreshold: 75,
  modelVersion: "approval-model-v2",
  analysedAt: "2026-10-06T10:13:00+05:30",
  humanReviewReason: "Confidence is 67%, below the 75% threshold for automatic routing.",
  reasons: [
    { text: "Within remaining department budget", tone: "supports" },
    { text: "Similar furniture requests were mostly approved", tone: "supports" },
    { text: "Request is 2.3x the historical average for this category", tone: "concern" },
    { text: "Budget pressure: projected utilisation reaches 80%", tone: "concern" },
    { text: "New vendor with no prior orders", tone: "concern" },
  ] satisfies Reason[],
  evidence: [
    { id: "REQ-421", summary: "Standing desks, 12 units", amount: 120000, outcome: "APPROVED", similarity: 0.82 },
    { id: "REQ-387", summary: "Ergonomic chairs, 10 units", amount: 71000, outcome: "APPROVED", similarity: 0.79 },
    { id: "REQ-298", summary: "Monitor arms, 20 units", amount: 96000, outcome: "REJECTED", similarity: 0.61 },
  ] satisfies Evidence[],
};

export const WORKFLOW: WorkflowStep[] = [
  { id: "submitted", label: "Submitted", state: "done", actor: "Meera Iyer", at: "6 Oct, 10:12" },
  { id: "ai", label: "AI analysis", state: "done", actor: "approval-model-v2", at: "6 Oct, 10:13" },
  { id: "dept", label: "Department approval", state: "done", actor: "Arjun Rao", at: "6 Oct, 15:40" },
  { id: "review", label: "Human review", state: "current" },
  { id: "finance", label: "Finance approval", state: "pending" },
  { id: "po", label: "Purchase order", state: "pending" },
];

export const HISTORY: HistoryEntry[] = [
  { id: "h1", actor: "Meera Iyer", role: "Requester", action: "Submitted the request", at: "6 Oct, 10:12" },
  {
    id: "h2",
    actor: "approval-model-v2",
    role: "AI",
    action: "Recommended APPROVE",
    at: "6 Oct, 10:13",
    comment: "Confidence 67%, risk MEDIUM",
  },
  {
    id: "h3",
    actor: "Arjun Rao",
    role: "Department Head",
    action: "Approved",
    at: "6 Oct, 15:40",
    comment: "The studio grew by 8 people this quarter.",
    decision: "APPROVE",
  },
  {
    id: "h4",
    actor: "System",
    role: "System",
    action: "Human review required",
    at: "6 Oct, 15:40",
    comment: "AI confidence is below the review threshold.",
  },
];

export const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
export const total = REQUEST.items.reduce((s, i) => s + i.qty * i.unit, 0);
export const utilisation = {
  now: Math.round((BUDGET.spent / BUDGET.departmentBudget) * 100),
  projected: Math.round(((BUDGET.spent + BUDGET.thisRequest) / BUDGET.departmentBudget) * 100),
  remaining: BUDGET.departmentBudget - BUDGET.spent,
};
