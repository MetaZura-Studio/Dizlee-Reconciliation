import { describe, expect, it } from "vitest";

import {
  createUserSchema,
  updateUserSchema,
} from "@/lib/admin/validation/users";
import { parseUserListFilters } from "@/lib/admin/users.shared";

describe("admin user validation", () => {
  it("accepts a valid Dizlee user without admin password", () => {
    const result = createUserSchema.safeParse({
      name: "Jane Doe",
      email: "jane@dizlee.com",
      role: "client",
      status: "ACTIVE",
    });

    expect(result.success).toBe(true);
  });

  it("accepts OpCo users without selecting an existing OpCo", () => {
    const result = createUserSchema.safeParse({
      name: "New OpCo",
      email: "newopco@gmail.com",
      role: "opco",
      status: "ACTIVE",
    });

    expect(result.success).toBe(true);
  });

  it("accepts Partner users without selecting an existing Partner", () => {
    const result = createUserSchema.safeParse({
      name: "New Partner",
      email: "newpartner@gmail.com",
      role: "partner",
      status: "ACTIVE",
    });

    expect(result.success).toBe(true);
  });

  it("does not require password on update", () => {
    const result = updateUserSchema.safeParse({
      name: "Spotify",
      email: "spotify@dizlee.com",
      role: "partner",
      status: "INACTIVE",
    });

    expect(result.success).toBe(true);
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
