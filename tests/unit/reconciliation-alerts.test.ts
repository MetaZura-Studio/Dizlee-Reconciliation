import { describe, expect, it } from "vitest";

import {
  buildReconciliationAlertPlaceholders,
  fallbackReconciliationAlert,
  renderReconciliationAlert,
} from "@/lib/dizlee/notifications/reconciliation-alerts";

const detail = {
  opcoName: "Zain KW",
  partnerName: "Partner One",
  period: { month: 7, year: 2026 },
  status: "Completed",
  matchedCount: 10,
  unmatchedCount: 2,
  totalVariance: 12.5,
  tolerancePercent: 5,
};

describe("reconciliation alert templates", () => {
  it("builds placeholders from reconciliation detail", () => {
    const values = buildReconciliationAlertPlaceholders(detail);
    expect(values.period).toBe("07/2026");
    expect(values.opcoName).toBe("Zain KW");
    expect(values.partnerName).toBe("Partner One");
    expect(values.matchedCount).toBe("10");
    expect(values.unmatchedCount).toBe("2");
    expect(values.outcome).toContain("2 mismatched");
  });

  it("renders OpCo and Partner templates with different copy", () => {
    const placeholders = buildReconciliationAlertPlaceholders(detail);
    const opco = renderReconciliationAlert(
      {
        subject: "OpCo alert — {{opcoName}} ({{period}})",
        body: "Dear OpCo {{opcoName}}, status is {{status}}.",
      },
      placeholders,
    );
    const partner = renderReconciliationAlert(
      {
        subject: "Partner alert — {{partnerName}} ({{period}})",
        body: "Dear Partner {{partnerName}}, unmatched={{unmatchedCount}}.",
      },
      placeholders,
    );

    expect(opco.subject).toBe("OpCo alert — Zain KW (07/2026)");
    expect(opco.body).toContain("Dear OpCo Zain KW");
    expect(partner.subject).toBe("Partner alert — Partner One (07/2026)");
    expect(partner.body).toContain("unmatched=2");
  });

  it("provides a fallback message when templates are missing", () => {
    const fallback = fallbackReconciliationAlert(detail);
    expect(fallback.subject).toContain("Zain KW");
    expect(fallback.body).toContain("Matched: 10");
  });
});
