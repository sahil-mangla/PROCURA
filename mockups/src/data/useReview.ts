import { useCallback, useState } from "react";
import { AI, HISTORY, WORKFLOW, type HistoryEntry, type Recommendation, type WorkflowStep } from "./mock-request";

export type Decision = "APPROVE" | "REJECT" | "REQUEST_INFO";

const REVIEWER = { name: "Kavita Nair", role: "Finance Manager" as const };

/**
 * Local-only simulation of the human review step so each design can show the decision moment.
 * In the real app this state comes from the backend, never from the browser.
 */
export function useReview() {
  const [decision, setDecision] = useState<{ action: Decision; reason: string } | null>(null);

  const submit = useCallback((action: Decision, reason: string) => setDecision({ action, reason }), []);
  const reset = useCallback(() => setDecision(null), []);

  const override = decision !== null && decision.action !== "REQUEST_INFO" && decision.action !== (AI.recommendation as Recommendation);

  const history: HistoryEntry[] = decision
    ? [
        ...HISTORY,
        {
          id: "h5",
          actor: REVIEWER.name,
          role: REVIEWER.role,
          action: decision.action === "APPROVE" ? "Approved" : decision.action === "REJECT" ? "Rejected" : "Requested more information",
          at: "Just now",
          comment: decision.reason || undefined,
          decision: decision.action,
        },
      ]
    : HISTORY;

  const workflow: WorkflowStep[] = decision
    ? WORKFLOW.map((s) => {
        if (s.id === "review") return { ...s, state: decision.action === "REQUEST_INFO" ? "current" : "done", actor: REVIEWER.name, at: "Just now" };
        if (s.id === "finance") return { ...s, state: decision.action === "APPROVE" ? "current" : "pending" };
        return s;
      })
    : WORKFLOW;

  return { decision, override, history, workflow, reviewer: REVIEWER, submit, reset };
}
