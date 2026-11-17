// Friendly names for the generated contract types. Regenerate schema.d.ts with `npm run gen:api`.
import type { components } from "./schema";

type S = components["schemas"];

export type CurrentUser = S["CurrentUser"];
export type Role = S["Role"];
export type PurchaseRequestSummary = S["PurchaseRequestSummary"];
export type PurchaseRequestDetail = S["PurchaseRequestDetail"];
export type RequestStatus = S["RequestStatus"];
export type AllowedAction = S["AllowedAction"];
export type WorkflowStep = S["WorkflowStep"];
export type HistoryEntry = S["HistoryEntry"];
export type HumanDecision = S["HumanDecision"];
export type AiAnalysis = S["AiAnalysis"];
export type AiStatus = S["AiStatus"];
export type Recommendation = S["Recommendation"];
export type RiskLevel = S["RiskLevel"];
export type Reason = S["Reason"];
export type ReviewTrigger = S["ReviewTrigger"];
export type Evidence = S["Evidence"];
export type Review = S["Review"];
export type Budget = S["Budget"];
export type LineItem = S["LineItem"];
export type Problem = S["Problem"];
export type Category = S["Category"];
export type Priority = S["Priority"];
export type Vendor = S["Vendor"];
export type PurchaseRequestInput = S["PurchaseRequestInput"];
