// Demo backend for the frontend: a small stateful stand-in for the Spring API, seeded with realistic requests.
// Follows contracts/openapi.yaml. State lives in memory, so restarting resets it. Run with `npm run mock`.
//
// Sign in with any persona below and the password `password123`:
//   requester@procura.local   Aarav Mehta, Requester, Engineering
//   depthead@procura.local    Priya Nair, Department head, Engineering
//   finance@procura.local     Rohan Iyer, Finance manager (sees the review queue)
//   admin@procura.local       Neha Kapoor, Admin
//   karthik@example.com     Karthik Rao, Requester, Operations
//   meera@example.com       Meera Shah, Department head, Operations
import http from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 4010);
const PASSWORD = "password123";
const THRESHOLD = 0.8;
const HIGH_VALUE = 1_000_000;
const HOUR = 3600e3;
const ago = (hours) => new Date(Date.now() - hours * HOUR).toISOString();
const inr = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

// ---------- reference data ----------
const departments = [
  { id: 1, name: "Engineering", headUserId: 2 },
  { id: 2, name: "Operations", headUserId: 6 },
];
const users = [
  { id: 1, name: "Aarav Mehta", email: "requester@procura.local", role: "REQUESTER", departmentId: 1, active: true },
  { id: 2, name: "Priya Nair", email: "depthead@procura.local", role: "DEPARTMENT_HEAD", departmentId: 1, active: true },
  { id: 3, name: "Rohan Iyer", email: "finance@procura.local", role: "FINANCE_MANAGER", departmentId: null, active: true },
  { id: 4, name: "Neha Kapoor", email: "admin@procura.local", role: "ADMIN", departmentId: null, active: true },
  { id: 5, name: "Karthik Rao", email: "karthik@example.com", role: "REQUESTER", departmentId: 2, active: true },
  { id: 6, name: "Meera Shah", email: "meera@example.com", role: "DEPARTMENT_HEAD", departmentId: 2, active: true },
];
const vendors = [
  { id: 1, name: "Dell India", email: "sales@dell.example", completedOrders: 14, firstOrderAt: ago(24 * 700) },
  { id: 2, name: "Godrej Interio", email: "b2b@godrej.example", completedOrders: 9, firstOrderAt: ago(24 * 600) },
  { id: 3, name: "Atlassian", email: "india@atlassian.example", completedOrders: 6, firstOrderAt: ago(24 * 500) },
  { id: 4, name: "Nilkamal Furniture", email: "orders@nilkamal.example", completedOrders: 0, firstOrderAt: null },
  { id: 5, name: "Amazon Business", email: "business@amazon.example", completedOrders: 31, firstOrderAt: ago(24 * 900) },
  { id: 6, name: "Cleartrip for Business", email: "corporate@cleartrip.example", completedOrders: 4, firstOrderAt: ago(24 * 400) },
  { id: 7, name: "APC by Schneider", email: "service@apc.example", completedOrders: 3, firstOrderAt: ago(24 * 350) },
  { id: 8, name: "SecureLearn Academy", email: "hello@securelearn.example", completedOrders: 0, firstOrderAt: null },
];
const budgets = [
  { departmentId: 1, fiscalYear: "2026-27", total: 5_000_000, spent: 2_150_000, committed: 420_000, currency: "INR" },
  { departmentId: 2, fiscalYear: "2026-27", total: 2_800_000, spent: 1_850_000, committed: 310_000, currency: "INR" },
];

const byId = (list, id) => list.find((x) => x.id === id);
const dept = (id) => byId(departments, id);
const vendor = (id) => byId(vendors, id);
const userRef = (id) => {
  const u = byId(users, id);
  return { id: u.id, name: u.name, role: u.role };
};
const budgetOf = (departmentId) => {
  const b = budgets.find((x) => x.departmentId === departmentId);
  return b && { ...b, remaining: b.total - b.spent - b.committed };
};
const SYSTEM = { id: 901, name: "System" };
const AI_ACTOR = { id: 900, name: "AI service" };

// What the AI cites for each category: [requestId, summary, amount, outcome, similarity].
const POOL = {
  IT_EQUIPMENT: [["PR-0921", "Latitude laptops, 6 units", 702000, "APPROVED", 0.91], ["PR-0954", "Developer laptops, 10 units", 985000, "APPROVED", 0.87], ["PR-0889", "Laptops, 15 units", 1620000, "REJECTED", 0.72]],
  SOFTWARE: [["PR-0903", "Jira licences, 150 seats", 540000, "APPROVED", 0.9], ["PR-0947", "Design tool licences", 210000, "APPROVED", 0.8], ["PR-0870", "Duplicate analytics suite", 460000, "REJECTED", 0.7]],
  OFFICE_FURNITURE: [["PR-0911", "Standing desks, 12 units", 288000, "APPROVED", 0.88], ["PR-0936", "Meeting room chairs", 142000, "APPROVED", 0.82], ["PR-0867", "Premium sofa set", 380000, "REJECTED", 0.69]],
  OFFICE_SUPPLIES: [["PR-0932", "Monitor stands, 20 units", 64000, "APPROVED", 0.85], ["PR-0901", "Whiteboards and markers", 28000, "APPROVED", 0.78]],
  SERVICES: [["PR-0915", "Cloud certification course", 180000, "APPROVED", 0.84], ["PR-0880", "Unscoped consulting retainer", 600000, "REJECTED", 0.7]],
  TRAVEL: [["PR-0925", "Sales kickoff travel", 410000, "APPROVED", 0.83], ["PR-0893", "Team dinner and offsite", 350000, "REJECTED", 0.77]],
  MAINTENANCE: [["PR-0918", "Server room AC service", 240000, "APPROVED", 0.86], ["PR-0904", "UPS battery replacement", 510000, "APPROVED", 0.89]],
  OTHER: [["PR-0940", "Miscellaneous equipment", 90000, "APPROVED", 0.6]],
};

// ---------- state ----------
const requests = new Map();
const reviews = new Map();
const orders = new Map();
let nextHistoryId = 1;
let nextAnalysisId = 1;
let nextReviewId = 1;
let nextItemId = 1;
let nextPoNo = 13;
let nextRequestNo = 1047;

const amount = (r) => r.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
const log = (r, entry) => r.history.push({ id: nextHistoryId++, actorType: "USER", actor: null, modelVersion: null, analysisId: null, fromStatus: null, toStatus: null, decision: null, aiRecommendation: null, override: false, comment: null, ...entry });
const setStatus = (r, to) => {
  r.status = to;
  r.version += 1;
};

function create({ id, title, description, category, priority = "NORMAL", vendorId, departmentId, requesterId, neededBy = null, items, at }) {
  const r = {
    id, title, description, category, priority, vendorId, departmentId, requesterId, neededBy,
    items: items.map((it) => ({ id: nextItemId++, ...it })),
    status: "DRAFT", version: 0, createdAt: at, submittedAt: null, aiStatus: "NOT_STARTED", analyses: [],
    openReviewId: null, purchaseOrderId: null, poFailed: false, hadReview: false, rejectedAt: null, history: [],
  };
  requests.set(id, r);
  log(r, { at, event: "REQUEST_CREATED", actor: userRef(requesterId), toStatus: "DRAFT" });
  return r;
}

function doSubmit(r, actor, at) {
  const from = r.status;
  setStatus(r, "SUBMITTED");
  r.submittedAt = at;
  r.aiStatus = "PENDING";
  log(r, { at, event: "REQUEST_SUBMITTED", actor: userRef(actor.id), fromStatus: from, toStatus: "SUBMITTED" });
}

function reasonsAndScore(r, over = {}) {
  const amt = amount(r);
  const v = vendor(r.vendorId);
  const d = dept(r.departmentId);
  const left = budgetOf(r.departmentId).remaining - amt;
  const pool = POOL[r.category] ?? POOL.OTHER;
  const approved = pool.filter((e) => e[3] === "APPROVED");
  const reasons = [
    left >= 0
      ? { code: "WITHIN_BUDGET", text: `Leaves ${inr(left)} of the ${d.name} budget`, tone: "SUPPORTS" }
      : { code: "BUDGET_EXCEEDED", text: `Exceeds the remaining ${d.name} budget by ${inr(-left)}`, tone: "CONCERN" },
    v.completedOrders > 0
      ? { code: "KNOWN_VENDOR", text: `${v.name} has ${v.completedOrders} completed orders`, tone: "SUPPORTS" }
      : { code: "NEW_VENDOR", text: "No prior orders with this vendor", tone: "CONCERN" },
  ];
  if (approved.length) reasons.push({ code: "SIMILAR_APPROVED", text: `${approved.length} similar requests were approved before`, tone: "SUPPORTS", evidenceIds: approved.map((e) => e[0]) });
  if (amt > 900000) reasons.push({ code: "HIGH_AMOUNT", text: "Amount is higher than most past requests in this category", tone: "CONCERN" });
  return {
    rec: over.rec ?? (left < 0 ? "REJECT" : "APPROVE"),
    conf: over.conf ?? (left < 0 ? 0.82 : v.completedOrders === 0 ? 0.78 : amt > 900000 ? 0.74 : 0.91),
    risk: over.risk ?? (left < 0 || amt > 900000 ? "HIGH" : v.completedOrders === 0 || amt > 500000 ? "MEDIUM" : "LOW"),
    reasons: [...reasons, ...(over.reasons ?? [])],
    evidence: pool.map(([requestId, summary, amt2, outcome, similarity]) => ({ requestId, summary, amount: amt2, outcome, similarity })),
  };
}

function attachAnalysis(r, over, at) {
  const s = reasonsAndScore(r, over);
  const a = {
    id: nextAnalysisId++, requestId: r.id, recommendation: s.rec, confidence: s.conf, riskLevel: s.risk,
    requiresHumanReview: s.conf < THRESHOLD, reviewThreshold: THRESHOLD, reasons: s.reasons,
    reviewTriggers: s.conf < THRESHOLD ? [{ code: "LOW_CONFIDENCE", text: `Confidence is ${Math.round(s.conf * 100)}%, below the 80% threshold`, source: "AI" }] : [],
    evidence: s.evidence, modelVersion: "approval-model-v2",
    agentVersions: { budget: "budget-agent-1.3", historical: "retrieval-1.1", risk: "risk-agent-1.0" }, analysedAt: at,
  };
  r.analyses.unshift(a);
  r.aiStatus = "COMPLETED";
  log(r, { at, event: "AI_ANALYSIS_COMPLETED", actorType: "AI", modelVersion: a.modelVersion, analysisId: a.id });
}

function aiUnavailable(r, at) {
  r.aiStatus = "UNAVAILABLE";
  log(r, { at, event: "AI_UNAVAILABLE", actorType: "SYSTEM" });
}

const stageOf = (from) => (from === "DEPARTMENT_APPROVED" ? "FINANCE_APPROVAL" : from === "HUMAN_REVIEW" ? "HUMAN_REVIEW" : "DEPARTMENT_APPROVAL");

/** After department approval: a person reviews if the AI was unsure or unavailable, or the amount is high. */
function route(r, at) {
  const ai = r.analyses[0];
  const triggers = [
    ...(ai?.reviewTriggers ?? []),
    ...(r.aiStatus === "UNAVAILABLE" ? [{ code: "AI_UNAVAILABLE", text: "The AI service was unavailable, so a person must review it", source: "RULE" }] : []),
    ...(amount(r) > HIGH_VALUE ? [{ code: "HIGH_VALUE", text: "Amount is above ₹10,00,000", source: "RULE" }] : []),
  ];
  if (!triggers.length) return;
  const review = { id: nextReviewId++, requestId: r.id, status: "OPEN", triggers, createdAt: at, decision: null, decidedBy: null, decidedAt: null, override: null, comment: null };
  reviews.set(review.id, review);
  r.openReviewId = review.id;
  r.hadReview = true;
  setStatus(r, "HUMAN_REVIEW");
  log(r, { at, event: "HUMAN_REVIEW_REQUIRED", actorType: "SYSTEM", fromStatus: "DEPARTMENT_APPROVED", toStatus: "HUMAN_REVIEW" });
}

function issuePo(r, at, fail = false) {
  if (fail) {
    r.poFailed = true;
    log(r, { at, event: "PO_GENERATION_FAILED", actorType: "SYSTEM", comment: "The purchasing system did not respond." });
    return;
  }
  const id = `PO-2026-${String(nextPoNo++).padStart(4, "0")}`;
  const approvers = [...new Map(r.history.filter((h) => h.actorType === "USER" && h.decision === "APPROVE").map((h) => [h.actor.id, h.actor])).values()];
  orders.set(id, { id, purchaseRequestId: r.id, vendor: vendor(r.vendorId), departmentName: dept(r.departmentId).name, items: r.items, total: amount(r), currency: "INR", issuedAt: at, approvedBy: approvers });
  r.purchaseOrderId = id;
  r.poFailed = false;
  setStatus(r, "PO_GENERATED");
  log(r, { at, event: "PO_GENERATED", actorType: "SYSTEM", fromStatus: "FINANCE_APPROVED", toStatus: "PO_GENERATED" });
}

/** Records a human decision and moves the request on. Returns whether it overrode the AI. */
function decide(r, actor, decision, comment, at, { failPo = false } = {}) {
  const ai = r.analyses[0] ?? null;
  const override = !!ai && decision !== "REQUEST_INFORMATION" && decision !== ai.recommendation;
  const from = r.status;
  const event = decision === "REQUEST_INFORMATION" ? "INFO_REQUESTED" : decision === "REJECT" ? "REQUEST_REJECTED" : from === "SUBMITTED" ? "DEPARTMENT_APPROVED" : "FINANCE_APPROVED";
  const to = decision === "REQUEST_INFORMATION" ? "INFO_REQUESTED" : decision === "REJECT" ? "REJECTED" : from === "SUBMITTED" ? "DEPARTMENT_APPROVED" : "FINANCE_APPROVED";
  if (to === "REJECTED") r.rejectedAt = stageOf(from);
  if (from === "HUMAN_REVIEW") {
    const rv = reviews.get(r.openReviewId);
    Object.assign(rv, { status: "DECIDED", decision, decidedBy: userRef(actor.id), decidedAt: at, override, comment: comment || null });
    r.openReviewId = null;
  }
  setStatus(r, to);
  log(r, { at, event, actor: userRef(actor.id), fromStatus: from, toStatus: to, decision, aiRecommendation: ai?.recommendation ?? null, override, comment: comment || null });
  if (to === "DEPARTMENT_APPROVED") route(r, at);
  if (to === "FINANCE_APPROVED") issuePo(r, at, failPo);
  return override;
}

// ---------- seed ----------
const U = (id) => byId(users, id);

{
  const r = create({ id: "PR-1035", title: "KubeCon tickets for the platform team", description: "Five passes for the platform engineers presenting a talk on our deployment pipeline.", category: "TRAVEL", vendorId: 6, departmentId: 1, requesterId: 1, neededBy: "2026-11-30", items: [{ description: "KubeCon NA conference pass", quantity: 5, unitPrice: 62000 }], at: ago(101) });
  doSubmit(r, U(1), ago(100));
  aiUnavailable(r, ago(100));
  decide(r, U(2), "APPROVE", "Talk accepted by the organisers; budget confirmed with the team lead.", ago(72));
}
{
  const r = create({ id: "PR-1036", title: "Handheld barcode scanners for the warehouse", description: "Replacing four scanners that no longer hold a charge.", category: "IT_EQUIPMENT", priority: "HIGH", vendorId: 5, departmentId: 2, requesterId: 5, neededBy: "2026-11-10", items: [{ description: "Zebra handheld scanner", quantity: 4, unitPrice: 24000 }], at: ago(1) });
  doSubmit(r, U(5), ago(0.03)); // the AI analysis is still running
}
{
  const r = create({ id: "PR-1037", title: "Core network switches", description: "Two 48-port switches for the second floor rack.", category: "IT_EQUIPMENT", vendorId: 1, departmentId: 1, requesterId: 1, items: [{ description: "Managed 48-port switch", quantity: 2, unitPrice: 370000 }], at: ago(122) });
  doSubmit(r, U(1), ago(120));
  attachAnalysis(r, { conf: 0.93, risk: "MEDIUM" }, ago(120));
  decide(r, U(2), "APPROVE", "", ago(96));
  decide(r, U(3), "APPROVE", "Within plan.", ago(80), { failPo: true });
}
{
  const r = create({ id: "PR-1038", title: "Lobby sofa set", description: "Seating for the reception area ahead of client visits.", category: "OFFICE_FURNITURE", vendorId: 2, departmentId: 2, requesterId: 5, items: [{ description: "Three-seater sofa", quantity: 2, unitPrice: 140000 }, { description: "Side table", quantity: 2, unitPrice: 50000 }], at: ago(262) });
  doSubmit(r, U(5), ago(260));
  attachAnalysis(r, { rec: "REJECT", conf: 0.87, risk: "MEDIUM", reasons: [{ code: "NON_ESSENTIAL", text: "Decorative furniture is rarely approved in this department", tone: "CONCERN" }] }, ago(260));
  decide(r, U(6), "APPROVE", "Needed for client visits next month.", ago(250));
  decide(r, U(3), "REJECT", "Not essential this quarter. Operations budget is tight.", ago(240));
}
{
  const r = create({ id: "PR-1039", title: "Standing desks, 12 units", description: "Desks for the new support team seating area.", category: "OFFICE_FURNITURE", vendorId: 2, departmentId: 2, requesterId: 5, items: [{ description: "Electric standing desk", quantity: 12, unitPrice: 24000 }], at: ago(402) });
  doSubmit(r, U(5), ago(400));
  attachAnalysis(r, { conf: 0.9, risk: "LOW" }, ago(400));
  decide(r, U(6), "APPROVE", "", ago(380));
  decide(r, U(3), "APPROVE", "", ago(360));
}
{
  const r = create({ id: "PR-1040", title: "Server room UPS replacement", description: "End-of-life units flagged in the last facilities audit.", category: "MAINTENANCE", priority: "HIGH", vendorId: 7, departmentId: 1, requesterId: 1, items: [{ description: "APC Smart-UPS 3kVA", quantity: 4, unitPrice: 130000 }], at: ago(302) });
  doSubmit(r, U(1), ago(300));
  attachAnalysis(r, { conf: 0.89, risk: "MEDIUM" }, ago(300));
  decide(r, U(2), "APPROVE", "", ago(280));
  decide(r, U(3), "APPROVE", "", ago(260));
}
{
  const r = create({ id: "PR-1041", title: "Team offsite in Goa", description: "Two-day offsite for the engineering leads.", category: "TRAVEL", vendorId: 6, departmentId: 1, requesterId: 1, items: [{ description: "Flights and stay per person", quantity: 7, unitPrice: 55000 }], at: ago(202) });
  doSubmit(r, U(1), ago(200));
  attachAnalysis(r, { conf: 0.86, risk: "LOW" }, ago(200));
  decide(r, U(2), "REJECT", "The offsite is not in this quarter's plan. Resubmit for next quarter.", ago(150));
}
{
  const r = create({ id: "PR-1042", title: "Laptops for new engineering hires", description: "Twelve laptops for the Q4 hiring plan. Developer spec, three-year warranty.", category: "IT_EQUIPMENT", priority: "HIGH", vendorId: 1, departmentId: 1, requesterId: 1, neededBy: "2026-11-15", items: [{ description: "Dell Latitude 7450, 32 GB", quantity: 12, unitPrice: 98500 }], at: ago(32) });
  doSubmit(r, U(1), ago(30));
  attachAnalysis(r, { conf: 0.72, risk: "MEDIUM" }, ago(30));
  decide(r, U(2), "APPROVE", "Hiring plan approved for Q4.", ago(20));
}
{
  const r = create({ id: "PR-1043", title: "Jira and Confluence licences", description: "Annual renewal plus 40 new seats for the product and QA teams.", category: "SOFTWARE", vendorId: 3, departmentId: 1, requesterId: 1, items: [{ description: "Jira + Confluence, per seat per year", quantity: 160, unitPrice: 4000 }], at: ago(7) });
  doSubmit(r, U(1), ago(6));
  attachAnalysis(r, { conf: 0.91, risk: "LOW" }, ago(6));
}
{
  const r = create({ id: "PR-1044", title: "Ergonomic chairs, fourth floor", description: "Replacing worn chairs reported by the operations team.", category: "OFFICE_FURNITURE", vendorId: 4, departmentId: 2, requesterId: 5, items: [{ description: "Ergonomic mesh chair", quantity: 25, unitPrice: 8400 }], at: ago(62) });
  doSubmit(r, U(5), ago(60));
  attachAnalysis(r, { conf: 0.88, risk: "MEDIUM" }, ago(60));
  decide(r, U(6), "APPROVE", "", ago(40));
}
{
  create({ id: "PR-1045", title: "Monitor arms for the design desks", description: "", category: "OFFICE_SUPPLIES", vendorId: 5, departmentId: 1, requesterId: 1, items: [{ description: "Dual monitor arm", quantity: 4, unitPrice: 9000 }], at: ago(3) });
}
{
  const r = create({ id: "PR-1046", title: "Cloud security training", description: "Certification course for the infrastructure team.", category: "SERVICES", vendorId: 8, departmentId: 1, requesterId: 1, items: [{ description: "Security certification course", quantity: 10, unitPrice: 15000 }], at: ago(92) });
  doSubmit(r, U(1), ago(90));
  attachAnalysis(r, { conf: 0.81, risk: "MEDIUM" }, ago(90));
  decide(r, U(2), "REQUEST_INFORMATION", "Please attach two vendor quotes before I can approve this.", ago(60));
}

// ---------- views ----------
const canSee = (r, u) => (u.role === "REQUESTER" ? r.requesterId === u.id : u.role === "DEPARTMENT_HEAD" ? r.departmentId === u.departmentId : true);

function allowed(r, u) {
  const mine = r.requesterId === u.id;
  const out = [];
  if (mine && r.status === "DRAFT") out.push("EDIT", "DELETE", "SUBMIT");
  if (mine && r.status === "INFO_REQUESTED") out.push("EDIT", "SUBMIT");
  if (u.role === "DEPARTMENT_HEAD" && u.departmentId === r.departmentId && !mine && r.status === "SUBMITTED") out.push("APPROVE", "REJECT", "REQUEST_INFORMATION");
  if (u.role === "FINANCE_MANAGER") {
    if (r.status === "DEPARTMENT_APPROVED") out.push("APPROVE", "REJECT", "REQUEST_INFORMATION");
    if (r.status === "HUMAN_REVIEW") out.push("REVIEW");
    if (r.status === "FINANCE_APPROVED" && r.poFailed) out.push("RETRY_PO");
  }
  return out;
}

const STEPS = [
  ["SUBMITTED", "Submitted"], ["AI_ANALYSIS", "AI analysis"], ["DEPARTMENT_APPROVAL", "Department approval"],
  ["HUMAN_REVIEW", "Human review"], ["FINANCE_APPROVAL", "Finance approval"], ["PURCHASE_ORDER", "Purchase order"],
];
const STEP_EVENT = { SUBMITTED: (h) => h.event === "REQUEST_SUBMITTED", AI_ANALYSIS: (h) => h.event === "AI_ANALYSIS_COMPLETED", DEPARTMENT_APPROVAL: (h) => h.fromStatus === "SUBMITTED" && h.actorType === "USER", HUMAN_REVIEW: (h) => h.fromStatus === "HUMAN_REVIEW", FINANCE_APPROVAL: (h) => h.fromStatus === "DEPARTMENT_APPROVED" && h.actorType === "USER", PURCHASE_ORDER: (h) => h.event === "PO_GENERATED" };

function workflowSteps(r) {
  const cur = { DRAFT: 0, INFO_REQUESTED: 0, SUBMITTED: 2, HUMAN_REVIEW: 3, DEPARTMENT_APPROVED: 4, FINANCE_APPROVED: 5, PO_GENERATED: 6 }[r.status] ?? STEPS.findIndex(([k]) => k === r.rejectedAt);
  return STEPS.map(([key, label], i) => {
    let state = i < cur ? "DONE" : i === cur ? "CURRENT" : "PENDING";
    if (key === "AI_ANALYSIS") state = r.aiStatus === "UNAVAILABLE" ? "SKIPPED" : r.status === "SUBMITTED" && r.aiStatus === "PENDING" ? "CURRENT" : state;
    if (key === "HUMAN_REVIEW" && i < cur && !r.hadReview) state = "SKIPPED";
    if (r.status === "REJECTED" && i === cur) state = "FAILED";
    if (key === "PURCHASE_ORDER" && r.status === "FINANCE_APPROVED") state = r.poFailed ? "FAILED" : "CURRENT";
    const entry = state === "DONE" || state === "FAILED" ? [...r.history].reverse().find(STEP_EVENT[key]) ?? [...r.history].reverse().find((h) => h.event === "REQUEST_REJECTED") : null;
    const actor = key === "AI_ANALYSIS" && state === "DONE" ? AI_ACTOR : key === "PURCHASE_ORDER" && state === "DONE" ? SYSTEM : entry?.actor ?? null;
    return { key, label, state, actor, at: entry?.at ?? null };
  });
}

function summary(r) {
  const ai = r.analyses[0];
  return {
    id: r.id, title: r.title, status: r.status, amount: amount(r), currency: "INR", category: r.category, priority: r.priority,
    requester: userRef(r.requesterId), departmentId: r.departmentId, departmentName: dept(r.departmentId).name, vendorName: vendor(r.vendorId).name,
    submittedAt: r.submittedAt, aiStatus: r.aiStatus, aiRecommendation: ai?.recommendation ?? null, riskLevel: ai?.riskLevel ?? null, version: r.version,
  };
}

function detail(r, u) {
  return {
    ...summary(r), description: r.description, neededBy: r.neededBy, vendor: vendor(r.vendorId),
    items: r.items.map((it) => ({ ...it, lineTotal: it.quantity * it.unitPrice })), budget: budgetOf(r.departmentId),
    aiAnalysis: r.analyses[0] ?? null, openReviewId: r.openReviewId, purchaseOrderId: r.purchaseOrderId,
    allowedActions: allowed(r, u), workflowSteps: workflowSteps(r), createdAt: r.createdAt,
  };
}

const reviewDto = (rv) => {
  const r = requests.get(rv.requestId);
  const ai = r.analyses[0];
  return { ...rv, requestTitle: r.title, amount: amount(r), aiRecommendation: ai?.recommendation ?? null, aiConfidence: ai?.confidence ?? null };
};

// ---------- http ----------
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const makeToken = (u) => `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: String(u.id), exp: Math.floor(Date.now() / 1000) + 28800 })}.demo`;
function authenticate(req) {
  const token = /^Bearer (.+)$/.exec(req.headers.authorization ?? "")?.[1];
  try {
    const { sub, exp } = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return exp * 1000 > Date.now() ? byId(users, Number(sub)) ?? null : null;
  } catch {
    return null;
  }
}
const currentUser = (u) => ({ ...u, department: u.departmentId ? dept(u.departmentId) : undefined });

const send = (res, status, body, type = "application/json") => {
  res.writeHead(status, { "content-type": type });
  res.end(body === undefined ? undefined : JSON.stringify(body));
};
const json = (res, body, status = 200) => send(res, status, body);
const problem = (res, status, code, title, detail, errors) =>
  send(res, status, { type: `https://procura.local/problems/${code.toLowerCase().replaceAll("_", "-")}`, title, status, code, detail, errors }, "application/problem+json");
const forbidden = (res) => problem(res, 403, "FORBIDDEN", "You do not have permission to do that");
const notFound = (res) => problem(res, 404, "NOT_FOUND", "Not found");
const conflict = (res, r) => problem(res, 409, "WORKFLOW_CONFLICT", "Someone else acted on this request first", `${r.id} is now ${r.status}. Reload to see the latest state.`);
const invalid = (res, errors) => problem(res, 400, "VALIDATION_FAILED", "Some details need attention", undefined, errors);

const readBody = (req) =>
  new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
    });
  });

const page = (items, q) => {
  const size = Math.min(100, Math.max(1, Number(q.get("size")) || 20));
  const p = Math.max(0, Number(q.get("page")) || 0);
  return { page: p, size, totalItems: items.length, items: items.slice(p * size, p * size + size) };
};

function validateInput(input) {
  const errors = [];
  if (!String(input.title ?? "").trim()) errors.push({ field: "title", message: "Enter a title" });
  if (!(input.category in POOL)) errors.push({ field: "category", message: "Choose a category" });
  if (!vendor(Number(input.vendorId))) errors.push({ field: "vendorId", message: "Choose a vendor" });
  if (!Array.isArray(input.items) || !input.items.length) errors.push({ field: "items", message: "Add at least one item" });
  (input.items ?? []).forEach((it, i) => {
    if (!String(it.description ?? "").trim()) errors.push({ field: `items[${i}].description`, message: "Describe the item" });
    if (!Number.isInteger(it.quantity) || it.quantity < 1) errors.push({ field: `items[${i}].quantity`, message: "Must be at least 1" });
    if (typeof it.unitPrice !== "number" || it.unitPrice < 0) errors.push({ field: `items[${i}].unitPrice`, message: "Enter an amount of 0 or more" });
  });
  return errors;
}

const apply = (r, input) => {
  Object.assign(r, { title: input.title.trim(), description: input.description ?? "", category: input.category, priority: input.priority ?? "NORMAL", vendorId: Number(input.vendorId), neededBy: input.neededBy ?? null });
  r.items = input.items.map((it) => ({ id: nextItemId++, description: it.description.trim(), quantity: it.quantity, unitPrice: it.unitPrice }));
};

/** A reason is needed to reject, to ask for information, and to disagree with the AI. */
function commentError(r, decision, comment) {
  const ai = r.analyses[0];
  const overrides = !!ai && decision !== "REQUEST_INFORMATION" && decision !== ai.recommendation;
  if (!comment && (decision !== "APPROVE" || overrides)) return [{ field: "comment", message: overrides ? "Say why you disagree with the AI" : "Enter a reason" }];
  return null;
}

async function handle(req, res) {
  const url = new URL(req.url, "http://mock");
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const q = url.searchParams;
  const method = req.method;
  let m;

  if (method === "POST" && path === "/auth/login") {
    const { email, password } = await readBody(req);
    const u = users.find((x) => x.email === String(email).toLowerCase());
    if (!u || password !== PASSWORD) return problem(res, 401, "UNAUTHENTICATED", "Email or password is wrong");
    return json(res, { accessToken: makeToken(u), expiresIn: 28800, user: currentUser(u) });
  }

  const u = authenticate(req);
  if (!u) return problem(res, 401, "UNAUTHENTICATED", "Sign in to continue");

  if (method === "GET" && path === "/auth/me") return json(res, currentUser(u));
  if (method === "GET" && path === "/departments") return json(res, departments);
  if (method === "GET" && path === "/vendors") {
    const term = (q.get("q") ?? "").toLowerCase();
    return json(res, vendors.filter((v) => v.name.toLowerCase().includes(term)));
  }
  if (method === "GET" && path === "/budgets") return json(res, budgets.map((b) => ({ ...b, remaining: b.total - b.spent - b.committed })));
  if (method === "GET" && path === "/users") return u.role === "ADMIN" ? json(res, page(users, q)) : forbidden(res);

  if (path === "/purchase-requests") {
    if (method === "GET") {
      const statuses = q.getAll("status").flatMap((s) => s.split(",")).filter(Boolean);
      const term = (q.get("q") ?? "").toLowerCase();
      const sort = q.get("sort") ?? "-submittedAt";
      const when = (r) => r.submittedAt ?? r.createdAt;
      let list = [...requests.values()].filter((r) => canSee(r, u));
      if (statuses.length) list = list.filter((r) => statuses.includes(r.status));
      if (q.get("needsMyAction") === "true") list = list.filter((r) => allowed(r, u).length > 0);
      if (q.get("mine") === "true") list = list.filter((r) => r.requesterId === u.id);
      if (q.get("departmentId")) list = list.filter((r) => r.departmentId === Number(q.get("departmentId")));
      if (term) list = list.filter((r) => [r.id, r.title, vendor(r.vendorId).name].some((s) => s.toLowerCase().includes(term)));
      list.sort(sort.endsWith("amount") ? (a, b) => amount(a) - amount(b) : (a, b) => when(a).localeCompare(when(b)));
      if (sort.startsWith("-")) list.reverse();
      const p = page(list, q);
      return json(res, { ...p, items: p.items.map(summary) });
    }
    if (method === "POST") {
      if (u.role !== "REQUESTER" && u.role !== "DEPARTMENT_HEAD") return forbidden(res);
      const input = await readBody(req);
      const errors = validateInput(input);
      if (errors.length) return invalid(res, errors);
      const r = create({ id: `PR-${nextRequestNo++}`, title: "", description: "", category: input.category, vendorId: Number(input.vendorId), departmentId: u.departmentId, requesterId: u.id, items: [], at: new Date().toISOString() });
      apply(r, input);
      return json(res, detail(r, u), 201);
    }
  }

  if ((m = /^\/purchase-requests\/(PR-\d+)(?:\/([a-z-]+))?$/.exec(path))) {
    const r = requests.get(m[1]);
    const sub = m[2];
    if (!r) return notFound(res);
    if (!canSee(r, u)) return forbidden(res);

    if (!sub && method === "GET") return json(res, detail(r, u));
    if (sub === "history" && method === "GET") return json(res, r.history);
    if (sub === "ai-analyses" && method === "GET") return json(res, r.analyses);

    if (!sub && method === "DELETE") {
      if (!allowed(r, u).includes("DELETE")) return problem(res, 409, "INVALID_TRANSITION", "Only your own drafts can be deleted");
      requests.delete(r.id);
      return send(res, 204);
    }
    if (!sub && method === "PUT") {
      const body = await readBody(req);
      if (!allowed(r, u).includes("EDIT")) return problem(res, 409, "INVALID_TRANSITION", "This request can no longer be edited", `${r.id} is ${r.status}.`);
      if (body.version !== r.version) return conflict(res, r);
      const errors = validateInput(body);
      if (errors.length) return invalid(res, errors);
      apply(r, body);
      r.version += 1;
      return json(res, detail(r, u));
    }

    if (sub === "purchase-order" && method === "POST") {
      if (u.role !== "FINANCE_MANAGER") return forbidden(res);
      if (!r.purchaseOrderId) {
        if (r.status !== "FINANCE_APPROVED") return problem(res, 409, "INVALID_TRANSITION", "A purchase order can only be generated for an approved request");
        issuePo(r, new Date().toISOString());
      }
      return json(res, orders.get(r.purchaseOrderId));
    }

    const decision = { approve: "APPROVE", reject: "REJECT", "request-information": "REQUEST_INFORMATION" }[sub];
    if (method === "POST" && (sub === "submit" || decision)) {
      const body = await readBody(req);
      if (sub === "submit" ? r.requesterId !== u.id : u.role !== "DEPARTMENT_HEAD" && u.role !== "FINANCE_MANAGER") return forbidden(res);
      if (body.version !== r.version) return conflict(res, r);
      if (!allowed(r, u).includes(sub === "submit" ? "SUBMIT" : decision)) return problem(res, 409, "INVALID_TRANSITION", "That action is no longer available", `${r.id} is ${r.status}.`);
      if (sub === "submit") {
        doSubmit(r, u, new Date().toISOString());
        // The analysis runs asynchronously (D13): the panel shows "in progress" until it lands a few seconds later.
        setTimeout(() => r.aiStatus === "PENDING" && attachAnalysis(r, {}, new Date().toISOString()), 4000);
        return json(res, detail(r, u));
      }
      const comment = String(body.comment ?? "").trim();
      const errors = commentError(r, decision, comment);
      if (errors) return invalid(res, errors);
      decide(r, u, decision, comment, new Date().toISOString());
      return json(res, detail(r, u));
    }
  }

  if (method === "GET" && path === "/reviews") {
    if (u.role !== "FINANCE_MANAGER") return forbidden(res);
    const status = q.get("status") ?? "OPEN";
    const list = [...reviews.values()].filter((rv) => rv.status === status).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const p = page(list, q);
    return json(res, { ...p, items: p.items.map(reviewDto) });
  }
  if ((m = /^\/reviews\/(\d+)(\/decision)?$/.exec(path))) {
    const rv = reviews.get(Number(m[1]));
    if (!rv) return notFound(res);
    if (u.role !== "FINANCE_MANAGER") return forbidden(res);
    if (!m[2] && method === "GET") return json(res, reviewDto(rv));
    if (m[2] && method === "POST") {
      const body = await readBody(req);
      const r = requests.get(rv.requestId);
      if (rv.status !== "OPEN" || r.status !== "HUMAN_REVIEW") return problem(res, 409, "INVALID_TRANSITION", "This review has already been decided", `${r.id} is ${r.status}.`);
      if (body.version !== r.version) return conflict(res, r);
      if (!["APPROVE", "REJECT", "REQUEST_INFORMATION"].includes(body.decision)) return invalid(res, [{ field: "decision", message: "Choose a decision" }]);
      const comment = String(body.comment ?? "").trim();
      const errors = commentError(r, body.decision, comment);
      if (errors) return invalid(res, errors);
      decide(r, u, body.decision, comment, new Date().toISOString());
      return json(res, detail(r, u));
    }
  }

  if (method === "GET" && path === "/purchase-orders") return json(res, page([...orders.values()].filter((o) => canSee(requests.get(o.purchaseRequestId), u)), q));
  if ((m = /^\/purchase-orders\/(.+)$/.exec(path)) && method === "GET") {
    const o = orders.get(m[1]);
    return o ? json(res, o) : notFound(res);
  }

  return notFound(res);
}

http
  .createServer((req, res) => handle(req, res).catch((e) => {
    console.error(e);
    problem(res, 500, "INTERNAL_ERROR", "The mock server hit an error", String(e?.message ?? e));
  }))
  .listen(PORT, () => console.log(`Procura demo API on http://localhost:${PORT} (${requests.size} requests). Password for every persona: ${PASSWORD}`));
