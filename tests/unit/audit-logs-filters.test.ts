import { describe, expect, it } from "vitest";

import {
  buildAuditLogCsv,
  buildAuditLogQuery,
  escapeCsvValue,
  parseAuditLogListFilters,
  parseDateBoundary,
} from "@/lib/admin/audit-logs.shared";

describe("parseAuditLogListFilters", () => {
  it("parses defaults", () => {
    const filters = parseAuditLogListFilters(new URLSearchParams());

    expect(filters).toMatchObject({
      search: "",
      entityType: "all",
      actorRole: "all",
      action: "all",
      entityId: "",
      dateFrom: "",
      dateTo: "",
      sortBy: "createdAt",
      sortDir: "desc",
      page: 1,
      pageSize: 25,
    });
  });

  it("parses filter query params", () => {
    const filters = parseAuditLogListFilters(
      new URLSearchParams({
        search: "updated",
        entityType: "SETTINGS",
        actorRole: "admin",
        action: "USER_CREATED",
        entityId: "42",
        dateFrom: "2026-07-01",
        dateTo: "2026-07-08",
        sortBy: "action",
        sortDir: "asc",
        page: "2",
        pageSize: "50",
      }),
    );

    expect(filters).toMatchObject({
      search: "updated",
      entityType: "SETTINGS",
      actorRole: "ADMIN",
      action: "USER_CREATED",
      entityId: "42",
      dateFrom: "2026-07-01",
      dateTo: "2026-07-08",
      sortBy: "action",
      sortDir: "asc",
      page: 2,
      pageSize: 50,
    });
  });
});

describe("buildAuditLogQuery", () => {
  it("includes default sort params", () => {
    const query = buildAuditLogQuery(
      parseAuditLogListFilters(new URLSearchParams()),
    );

    expect(query).toBe("page=1&pageSize=25&sortBy=createdAt&sortDir=desc");
  });
});

describe("parseDateBoundary", () => {
  it("returns start and end of day boundaries", () => {
    const start = parseDateBoundary("2026-07-05", "start");
    const end = parseDateBoundary("2026-07-05", "end");

    expect(start?.getHours()).toBe(0);
    expect(end?.getHours()).toBe(23);
    expect(end?.getMinutes()).toBe(59);
  });
});

describe("escapeCsvValue", () => {
  it("quotes values with commas or quotes", () => {
    expect(escapeCsvValue("plain")).toBe("plain");
    expect(escapeCsvValue('say "hello"')).toBe('"say ""hello"""');
    expect(escapeCsvValue("a,b")).toBe('"a,b"');
  });
});

describe("buildAuditLogCsv", () => {
  it("builds a header row and one data row", () => {
    const csv = buildAuditLogCsv([
      {
        id: "1",
        createdAt: "2026-07-05T10:00:00.000Z",
        actorName: "Admin",
        actorEmail: "admin@dizlee.com",
        actorRole: "ADMIN",
        actionCode: "USER_CREATED",
        actionLabel: "USER CREATED",
        entityTypeCode: "USER",
        entityTypeLabel: "USER",
        entityId: "99",
        message: "Created user",
      },
    ]);

    expect(csv.startsWith("Timestamp,Actor name")).toBe(true);
    expect(csv).toContain("admin@dizlee.com");
    expect(csv).toContain("Created user");
  });
});
