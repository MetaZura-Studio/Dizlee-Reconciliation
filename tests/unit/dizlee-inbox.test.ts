import { describe, expect, it } from "vitest";

import { parseInboxFilters } from "@/lib/dizlee/notifications/inbox-filters";

describe("parseInboxFilters", () => {
  it("defaults to page 1 and all messages", () => {
    expect(parseInboxFilters(new URLSearchParams())).toEqual({
      page: 1,
      readFilter: "all",
      search: "",
    });
  });

  it("parses read and unread filters", () => {
    expect(
      parseInboxFilters(new URLSearchParams({ filter: "read", page: "2" })),
    ).toEqual({
      page: 2,
      readFilter: "read",
      search: "",
    });

    expect(parseInboxFilters(new URLSearchParams({ filter: "unread" }))).toEqual(
      {
        page: 1,
        readFilter: "unread",
        search: "",
      },
    );
  });

  it("maps legacy unreadOnly=true to unread filter", () => {
    expect(parseInboxFilters(new URLSearchParams({ unreadOnly: "true" }))).toEqual(
      {
        page: 1,
        readFilter: "unread",
        search: "",
      },
    );
  });

  it("parses search text", () => {
    expect(
      parseInboxFilters(new URLSearchParams({ search: "  reupload  " })),
    ).toEqual({
      page: 1,
      readFilter: "all",
      search: "reupload",
    });
  });
});
