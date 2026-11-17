import { describe, expect, it } from "vitest";
import { categoryLabel, date, dateTime, decisionLabel, humanize, inr, pct, roleLabel, statusLabel, statusTone } from "./format";

describe("inr", () => {
  it("uses Indian digit grouping and drops paise", () => {
    expect(inr(1234567)).toBe("₹12,34,567");
    expect(inr(90000.4)).toBe("₹90,000");
  });
});

describe("pct", () => {
  it("turns the contract's 0 to 1 confidence into whole percentages (D1)", () => {
    expect(pct(0)).toBe(0);
    expect(pct(0.9674)).toBe(97);
    expect(pct(1)).toBe(100);
  });
});

describe("humanize / categoryLabel", () => {
  it("turns enums into sentence case", () => {
    expect(humanize("OFFICE_FURNITURE")).toBe("Office furniture");
    expect(humanize("HIGH")).toBe("High");
  });
  it("keeps IT capitalised", () => {
    expect(categoryLabel("IT_EQUIPMENT")).toBe("IT equipment");
    expect(categoryLabel("SOFTWARE")).toBe("Software");
  });
});

describe("dates", () => {
  it("formats in India time regardless of the machine's zone", () => {
    expect(date("2026-11-17T20:00:00Z")).toBe("18 Nov 2026");
    expect(dateTime("2026-11-17T04:46:00Z")).toBe("17 Nov, 10:16");
  });
});

describe("label tables", () => {
  const statuses = ["DRAFT", "SUBMITTED", "INFO_REQUESTED", "DEPARTMENT_APPROVED", "HUMAN_REVIEW", "FINANCE_APPROVED", "PO_GENERATED", "REJECTED"] as const;

  it("has a label and a tone for every request status in the contract", () => {
    for (const s of statuses) {
      expect(statusLabel[s]).toBeTruthy();
      expect(statusTone[s]).toBeTruthy();
    }
  });
  it("labels every role and human decision", () => {
    expect(Object.keys(roleLabel).sort()).toEqual(["ADMIN", "DEPARTMENT_HEAD", "FINANCE_MANAGER", "REQUESTER"]);
    expect(Object.keys(decisionLabel).sort()).toEqual(["APPROVE", "REJECT", "REQUEST_INFORMATION"]);
  });
});
