import { describe, expect, it } from "vitest";

import { nextSortState } from "@/lib/ui/sort";

describe("nextSortState", () => {
  it("toggles direction when the same field is clicked", () => {
    expect(nextSortState("uploaded", "desc", "uploaded")).toEqual({
      sortBy: "uploaded",
      sortDir: "asc",
    });
    expect(nextSortState("uploaded", "asc", "uploaded")).toEqual({
      sortBy: "uploaded",
      sortDir: "desc",
    });
  });

  it("switches field and defaults to asc", () => {
    expect(nextSortState("uploaded", "desc", "period")).toEqual({
      sortBy: "period",
      sortDir: "asc",
    });
  });
});
