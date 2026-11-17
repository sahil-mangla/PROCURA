import type { HumanDecision, RequestStatus, RiskLevel, Role } from "./api/types";

const inrFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const inr = (n: number) => inrFormat.format(n);

/** Contract confidence is 0 to 1 (D1). The UI shows whole percentages. */
export const pct = (fraction: number) => Math.round(fraction * 100);

const dateTimeFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
export const dateTime = (iso: string) => dateTimeFormat.format(new Date(iso));
export const date = (iso: string) => dateFormat.format(new Date(iso));

export const statusLabel: Record<RequestStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Waiting for department",
  INFO_REQUESTED: "Information requested",
  DEPARTMENT_APPROVED: "Waiting for finance",
  HUMAN_REVIEW: "Human review",
  FINANCE_APPROVED: "Finance approved",
  PO_GENERATED: "Purchase order issued",
  REJECTED: "Rejected",
};

export const statusTone: Record<RequestStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SUBMITTED: "bg-primary/12 text-primary",
  INFO_REQUESTED: "bg-warn/12 text-warn",
  DEPARTMENT_APPROVED: "bg-primary/12 text-primary",
  HUMAN_REVIEW: "bg-[#f1d27a] text-foreground",
  FINANCE_APPROVED: "bg-ok/12 text-ok",
  PO_GENERATED: "bg-ok text-white",
  REJECTED: "bg-destructive/12 text-destructive",
};

export const riskTone: Record<RiskLevel, string> = { LOW: "text-ok", MEDIUM: "text-warn", HIGH: "text-destructive" };

export const roleLabel: Record<Role, string> = {
  REQUESTER: "Requester",
  DEPARTMENT_HEAD: "Department head",
  FINANCE_MANAGER: "Finance manager",
  ADMIN: "Admin",
};

export const decisionLabel: Record<HumanDecision, string> = {
  APPROVE: "Approved",
  REJECT: "Rejected",
  REQUEST_INFORMATION: "Information requested",
};

/** Turns an enum such as OFFICE_FURNITURE into "Office furniture". */
export const humanize = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");

const categoryLabels: Record<string, string> = { IT_EQUIPMENT: "IT equipment" };
/** Category names for display; plain humanize would turn "IT" into "It". */
export const categoryLabel = (c: string) => categoryLabels[c] ?? humanize(c);
