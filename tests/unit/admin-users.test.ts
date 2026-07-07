import { describe, expect, it } from "vitest";

import {
  createUserSchema,
  updateUserSchema,
} from "@/lib/admin/validation/users";
import { parseUserListFilters } from "@/lib/admin/users.shared";

describe("admin user validation", () => {
  it("accepts a valid Dizlee user with initial password", () => {
    const result = createUserSchema.safeParse({
      name: "Jane Doe",
      email: "jane@dizlee.com",
      role: "client",
      status: "ACTIVE",
      password: "Password123!",
    });

    expect(result.success).toBe(true);
  });

  it("requires a valid initial password on create", () => {
    const result = createUserSchema.safeParse({
      name: "Jane Doe",
      email: "jane@dizlee.com",
      role: "client",
      status: "ACTIVE",
      password: "short",
    });

    expect(result.success).toBe(false);
  });

  it("requires OpCo when role is opco", () => {
    const result = createUserSchema.safeParse({
      name: "OpCo User",
      email: "opco.user@dizlee.com",
      role: "opco",
      status: "ACTIVE",
    });

    expect(result.success).toBe(false);
  });

  it("requires Partner when role is partner", () => {
    const result = createUserSchema.safeParse({
      name: "Partner User",
      email: "partner.user@dizlee.com",
      role: "partner",
      status: "ACTIVE",
      opcoId: null,
      partnerId: null,
    });

    expect(result.success).toBe(false);
  });

  it("accepts a valid OpCo user with assignment", () => {
    const result = createUserSchema.safeParse({
      name: "Jordan OpCo",
      email: "zain-jordan@dizlee.com",
      role: "opco",
      status: "ACTIVE",
      opcoId: "4",
      partnerId: null,
      password: "Password123!",
    });

    expect(result.success).toBe(true);
  });

  it("rejects Dizlee users linked to OpCo or Partner", () => {
    const result = createUserSchema.safeParse({
      name: "Invalid Client",
      email: "bad@dizlee.com",
      role: "client",
      status: "ACTIVE",
      opcoId: "1",
    });

    expect(result.success).toBe(false);
  });

  it("does not require password on update", () => {
    const result = updateUserSchema.safeParse({
      name: "Spotify",
      email: "spotify@dizlee.com",
      role: "partner",
      status: "INACTIVE",
      partnerId: "11",
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
