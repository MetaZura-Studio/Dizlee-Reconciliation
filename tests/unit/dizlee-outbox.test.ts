import { describe, expect, it } from "vitest";

import {
  classifyOutboxKind,
  parseOutboxFilters,
} from "@/lib/dizlee/notifications/outbox-filters";

describe("parseOutboxFilters", () => {
  it("defaults to page 1 and all kinds", () => {
    expect(parseOutboxFilters(new URLSearchParams())).toEqual({
      page: 1,
      kind: "all",
    });
  });

  it("parses intimation, reminder, and other filters", () => {
    expect(
      parseOutboxFilters(new URLSearchParams({ filter: "intimation", page: "2" })),
    ).toEqual({
      page: 2,
      kind: "intimation",
    });

    expect(
      parseOutboxFilters(new URLSearchParams({ filter: "reminder" })),
    ).toEqual({
      page: 1,
      kind: "reminder",
    });

    expect(parseOutboxFilters(new URLSearchParams({ filter: "other" }))).toEqual(
      {
        page: 1,
        kind: "other",
      },
    );
  });

  it("ignores unknown filter values", () => {
    expect(
      parseOutboxFilters(new URLSearchParams({ filter: "unread" })),
    ).toEqual({
      page: 1,
      kind: "all",
    });
  });
});

describe("classifyOutboxKind", () => {
  it("maps reminder priority", () => {
    expect(classifyOutboxKind("REMINDER")).toBe("reminder");
  });

  it("maps intimation and urgency priorities", () => {
    expect(classifyOutboxKind(null)).toBe("intimation");
    expect(classifyOutboxKind("")).toBe("intimation");
    expect(classifyOutboxKind("NORMAL")).toBe("intimation");
    expect(classifyOutboxKind("HIGH")).toBe("intimation");
    expect(classifyOutboxKind("LOW")).toBe("intimation");
    expect(classifyOutboxKind("INTIMATION")).toBe("intimation");
  });

  it("maps unknown priorities to other", () => {
    expect(classifyOutboxKind("URGENT")).toBe("other");
  });
});
