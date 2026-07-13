import { describe, expect, it } from "vitest";

import {
  createUserSchema,
  updateUserSchema,
} from "@/lib/admin/validation/users";
import { parseUserListFilters } from "@/lib/admin/users.shared";

describe("admin user validation", () => {
  it("accepts a valid Dizlee user without org links", () => {
    const result = createUserSchema.safeParse({
      name: "Jane Doe",
      email: "jane@dizlee.com",
      role: "client",
      status: "ACTIVE",
    });

    expect(result.success).toBe(true);
  });

  it("requires an OpCo when role is opco", () => {
    const missing = createUserSchema.safeParse({
      name: "OpCo User",
      email: "opco-user@gmail.com",
      role: "opco",
      status: "ACTIVE",
    });

    expect(missing.success).toBe(false);
    if (!missing.success) {
      expect(missing.error.issues[0]?.message).toBe("Select an OpCo");
    }

    const ok = createUserSchema.safeParse({
      name: "OpCo User",
      email: "opco-user@gmail.com",
      role: "opco",
      status: "ACTIVE",
      opcoId: "4",
    });

    expect(ok.success).toBe(true);
  });

  it("requires a Partner when role is partner", () => {
    const missing = createUserSchema.safeParse({
      name: "Partner User",
      email: "partner-user@gmail.com",
      role: "partner",
      status: "ACTIVE",
    });

    expect(missing.success).toBe(false);
    if (!missing.success) {
      expect(missing.error.issues[0]?.message).toBe("Select a Partner");
    }

    const ok = createUserSchema.safeParse({
      name: "Partner User",
      email: "partner-user@gmail.com",
      role: "partner",
      status: "ACTIVE",
      partnerId: "11",
    });

    expect(ok.success).toBe(true);
  });

  it("rejects cross-role org links", () => {
    const result = updateUserSchema.safeParse({
      name: "Spotify User",
      email: "spotify-user@dizlee.com",
      role: "partner",
      status: "INACTIVE",
      partnerId: "11",
      opcoId: "4",
    });

    expect(result.success).toBe(false);
  });
});

describe("parseUserListFilters", () => {
  it("parses defaults", () => {
    const filters = parseUserListFilters(new URLSearchParams());

    expect(filters).toMatchObject({
      search: "",
      role: "all",
      status: "all",
      sortBy: "name",
      sortDir: "asc",
      page: 1,
      pageSize: 20,
    });
  });

  it("parses search and sort params", () => {
    const filters = parseUserListFilters(
      new URLSearchParams({
        search: "spotify",
        role: "partner",
        status: "ACTIVE",
        sortBy: "email",
        sortDir: "desc",
        page: "2",
      }),
    );

    expect(filters).toMatchObject({
      search: "spotify",
      role: "partner",
      status: "ACTIVE",
      sortBy: "email",
      sortDir: "desc",
      page: 2,
    });
  });
});
