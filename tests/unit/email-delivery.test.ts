import { describe, expect, it } from "vitest";

import {
  classifySmtpError,
  mapOutboxEmailReason,
  passwordPurposeToDeliveryPurpose,
  summarizeOutboxEmailSend,
  truncateEmailErrorMessage,
  truncateEmailSubject,
} from "@/lib/auth/email-delivery.shared";
import { emailDeliveryReadinessFromSmtp } from "@/lib/auth/email-delivery-readiness";
import {
  buildEmailDeliveryQuery,
  parseEmailDeliveryListFilters,
} from "@/lib/admin/email-delivery.shared";

describe("emailDeliveryReadinessFromSmtp", () => {
  it("requires SMTP credentials even when host is set", () => {
    expect(
      emailDeliveryReadinessFromSmtp({
        ok: true,
        config: {
          host: "smtp.titan.email",
          port: 587,
          secure: false,
          from: "noreply@dizlee.com",
        },
      }),
    ).toEqual({ ready: false, reason: "smtp_credentials_missing" });

    expect(
      emailDeliveryReadinessFromSmtp({
        ok: true,
        config: {
          host: "smtp.titan.email",
          port: 587,
          secure: false,
          from: "noreply@dizlee.com",
          auth: { user: "user", pass: "secret" },
        },
      }),
    ).toEqual({ ready: true, reason: null });

    expect(
      emailDeliveryReadinessFromSmtp({
        ok: false,
        reason: "smtp_not_configured",
      }),
    ).toEqual({ ready: false, reason: "smtp_not_configured" });
  });
});

describe("email delivery shared helpers", () => {
  it("classifies nodemailer-style network errors", () => {
    expect(classifySmtpError(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" }))).toEqual({
      errorCode: "ETIMEDOUT",
      errorMessage: "timeout",
    });

    expect(classifySmtpError(new Error("getaddrinfo ENOTFOUND smtp.example.com")).errorCode).toBe(
      "ENOTFOUND",
    );

    expect(
      classifySmtpError(new Error("Invalid login: authentication failed")).errorCode,
    ).toBe("EAUTH");

    expect(classifySmtpError(new Error("something else")).errorCode).toBe("SMTP");
  });

  it("truncates subject and error message", () => {
    expect(truncateEmailSubject("  Hello  ")).toBe("Hello");
    expect(truncateEmailSubject("")).toBe("(no subject)");
    expect(truncateEmailSubject("x".repeat(300)).length).toBe(255);

    expect(truncateEmailErrorMessage("ok")).toBe("ok");
    expect(truncateEmailErrorMessage("y".repeat(2500)).length).toBe(2000);
  });

  it("maps password purposes", () => {
    expect(passwordPurposeToDeliveryPurpose("invite")).toBe("PASSWORD_INVITE");
    expect(passwordPurposeToDeliveryPurpose("forgot")).toBe("PASSWORD_FORGOT");
  });
});

describe("summarizeOutboxEmailSend", () => {
  it("marks system-only notifications as not applicable", () => {
    expect(
      summarizeOutboxEmailSend({
        deliveryChannel: "SYSTEM",
        statuses: ["ACCEPTED"],
      }).label,
    ).toBe("System only");
  });

  it("summarizes accepted, failed, mixed, and skipped outcomes", () => {
    expect(
      summarizeOutboxEmailSend({
        deliveryChannel: "BOTH",
        statuses: ["ACCEPTED", "ACCEPTED"],
      }),
    ).toMatchObject({
      label: "Sent",
      pillLabel: "Email: Sent",
      reason: null,
    });

    expect(
      summarizeOutboxEmailSend({
        deliveryChannel: "EMAIL",
        statuses: ["FAILED"],
      }),
    ).toMatchObject({
      label: "Failed",
      pillLabel: "Email: Failed",
    });

    expect(
      summarizeOutboxEmailSend({
        deliveryChannel: "BOTH",
        statuses: ["ACCEPTED", "FAILED"],
      }),
    ).toMatchObject({
      label: "Partly sent",
      pillLabel: "Email: Partly sent",
      reason: "Some recipients got the email; some did not.",
    });

    expect(
      summarizeOutboxEmailSend({
        deliveryChannel: "BOTH",
        statuses: ["SKIPPED", "SKIPPED"],
      }).pillLabel,
    ).toBe("Email: Not sent");

    expect(
      summarizeOutboxEmailSend({
        deliveryChannel: "EMAIL",
        statuses: [],
      }),
    ).toMatchObject({
      label: "Not sent",
      pillLabel: "Email: Not sent",
      reason: "No email attempt was recorded for this message.",
    });
  });
});

describe("mapOutboxEmailReason", () => {
  it("maps skip reasons and SMTP failures to plain language", () => {
    expect(
      mapOutboxEmailReason({
        status: "not_sent",
        attempts: [{ status: "SKIPPED", skipReason: "email_disabled" }],
      }),
    ).toBe("Email is turned off in Admin email settings.");

    expect(
      mapOutboxEmailReason({
        status: "not_sent",
        attempts: [{ status: "SKIPPED", skipReason: "smtp_not_configured" }],
      }),
    ).toBe("Email is not fully configured (SMTP).");

    expect(
      mapOutboxEmailReason({
        status: "failed",
        attempts: [
          {
            status: "FAILED",
            errorCode: "ETIMEDOUT",
            errorMessage: "connect ETIMEDOUT",
          },
        ],
      }),
    ).toBe("Could not reach the mail server.");

    expect(
      mapOutboxEmailReason({
        status: "failed",
        attempts: [
          {
            status: "FAILED",
            errorCode: "EAUTH",
            errorMessage: "Invalid login",
          },
        ],
      }),
    ).toBe("Mail server login failed.");

    expect(
      mapOutboxEmailReason({
        status: "not_sent",
        attempts: [],
      }),
    ).toBe("No email attempt was recorded for this message.");

    expect(
      mapOutboxEmailReason({
        status: "sent",
        attempts: [{ status: "ACCEPTED" }],
      }),
    ).toBeNull();
  });
});

describe("parseEmailDeliveryListFilters", () => {
  it("applies defaults", () => {
    const filters = parseEmailDeliveryListFilters(new URLSearchParams());
    expect(filters).toMatchObject({
      search: "",
      status: "all",
      purpose: "all",
      sortBy: "createdAt",
      sortDir: "desc",
      page: 1,
      pageSize: 10,
    });
  });

  it("parses status, purpose, search, and paging", () => {
    const filters = parseEmailDeliveryListFilters(
      new URLSearchParams({
        search: "user@example.com",
        status: "failed",
        purpose: "reminder",
        page: "2",
        pageSize: "50",
        sortBy: "toEmail",
        sortDir: "asc",
        dateFrom: "2026-09-01",
        dateTo: "2026-09-08",
      }),
    );

    expect(filters.search).toBe("user@example.com");
    expect(filters.status).toBe("FAILED");
    expect(filters.purpose).toBe("REMINDER");
    expect(filters.page).toBe(2);
    expect(filters.pageSize).toBe(25);
    expect(filters.sortBy).toBe("toEmail");
    expect(filters.sortDir).toBe("asc");
    expect(filters.dateFrom).toBe("2026-09-01");
    expect(filters.dateTo).toBe("2026-09-08");
  });

  it("ignores invalid status", () => {
    const filters = parseEmailDeliveryListFilters(
      new URLSearchParams({ status: "BOUNCED" }),
    );
    expect(filters.status).toBe("all");
  });

  it("builds query strings from filters", () => {
    const query = buildEmailDeliveryQuery({
      search: "a@b.com",
      status: "FAILED",
      purpose: "ADMIN_TEST",
      dateFrom: "2026-09-01",
      dateTo: "",
      sortBy: "createdAt",
      sortDir: "desc",
      page: 1,
      pageSize: 10,
    });

    const params = new URLSearchParams(query);
    expect(params.get("search")).toBe("a@b.com");
    expect(params.get("status")).toBe("FAILED");
    expect(params.get("purpose")).toBe("ADMIN_TEST");
    expect(params.get("dateFrom")).toBe("2026-09-01");
    expect(params.get("dateTo")).toBeNull();
  });
});
