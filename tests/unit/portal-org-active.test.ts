import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedOpcoFindFirst = vi.fn();
const mockedPartnerFindFirst = vi.fn();
const mockedUserFindFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({
  default: {
    opco: { findFirst: (...args: unknown[]) => mockedOpcoFindFirst(...args) },
    partner: {
      findFirst: (...args: unknown[]) => mockedPartnerFindFirst(...args),
    },
    user: { findFirst: (...args: unknown[]) => mockedUserFindFirst(...args) },
  },
  prisma: {
    opco: { findFirst: (...args: unknown[]) => mockedOpcoFindFirst(...args) },
    partner: {
      findFirst: (...args: unknown[]) => mockedPartnerFindFirst(...args),
    },
    user: { findFirst: (...args: unknown[]) => mockedUserFindFirst(...args) },
  },
}));

import { loadActiveAuthUser } from "@/lib/auth/active-user";
import { isPortalOrgActiveForLogin } from "@/lib/auth/portal-org-active";

describe("isPortalOrgActiveForLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows admin and client without org lookup", async () => {
    await expect(
      isPortalOrgActiveForLogin({
        role: "admin",
        opcoId: null,
        partnerId: null,
      }),
    ).resolves.toBe(true);
    await expect(
      isPortalOrgActiveForLogin({
        role: "client",
        opcoId: null,
        partnerId: null,
      }),
    ).resolves.toBe(true);
    expect(mockedOpcoFindFirst).not.toHaveBeenCalled();
    expect(mockedPartnerFindFirst).not.toHaveBeenCalled();
  });

  it("rejects opco when org is missing or inactive", async () => {
    await expect(
      isPortalOrgActiveForLogin({
        role: "opco",
        opcoId: null,
        partnerId: null,
      }),
    ).resolves.toBe(false);

    mockedOpcoFindFirst.mockResolvedValueOnce(null);
    await expect(
      isPortalOrgActiveForLogin({
        role: "opco",
        opcoId: BigInt(1),
        partnerId: null,
      }),
    ).resolves.toBe(false);

    mockedOpcoFindFirst.mockResolvedValueOnce({
      status: { code: "INACTIVE" },
    });
    await expect(
      isPortalOrgActiveForLogin({
        role: "opco",
        opcoId: BigInt(1),
        partnerId: null,
      }),
    ).resolves.toBe(false);
  });

  it("allows opco when org is ACTIVE", async () => {
    mockedOpcoFindFirst.mockResolvedValueOnce({
      status: { code: "ACTIVE" },
    });
    await expect(
      isPortalOrgActiveForLogin({
        role: "opco",
        opcoId: BigInt(9),
        partnerId: null,
      }),
    ).resolves.toBe(true);
    expect(mockedOpcoFindFirst).toHaveBeenCalledWith({
      where: { id: BigInt(9), isDeleted: false },
      select: { status: { select: { code: true } } },
    });
  });

  it("rejects partner when org is missing or inactive", async () => {
    await expect(
      isPortalOrgActiveForLogin({
        role: "partner",
        opcoId: null,
        partnerId: null,
      }),
    ).resolves.toBe(false);

    mockedPartnerFindFirst.mockResolvedValueOnce({
      status: { code: "INACTIVE" },
    });
    await expect(
      isPortalOrgActiveForLogin({
        role: "partner",
        opcoId: null,
        partnerId: BigInt(3),
      }),
    ).resolves.toBe(false);
  });

  it("allows partner when org is ACTIVE", async () => {
    mockedPartnerFindFirst.mockResolvedValueOnce({
      status: { code: "ACTIVE" },
    });
    await expect(
      isPortalOrgActiveForLogin({
        role: "partner",
        opcoId: null,
        partnerId: BigInt(3),
      }),
    ).resolves.toBe(true);
  });
});

describe("loadActiveAuthUser org gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function activeOpcoUser(overrides?: {
    statusCode?: string;
    opcoId?: bigint | null;
  }) {
    return {
      id: BigInt(10),
      email: "opco@example.com",
      name: "OpCo User",
      passwordHash: "hash",
      opcoId: overrides?.opcoId === undefined ? BigInt(1) : overrides.opcoId,
      partnerId: null,
      role: { code: "OPCO" },
      status: { code: overrides?.statusCode ?? "ACTIVE" },
    };
  }

  function activePartnerUser(overrides?: {
    statusCode?: string;
    partnerId?: bigint | null;
  }) {
    return {
      id: BigInt(20),
      email: "partner@example.com",
      name: "Partner User",
      passwordHash: "hash",
      opcoId: null,
      partnerId:
        overrides?.partnerId === undefined ? BigInt(2) : overrides.partnerId,
      role: { code: "PARTNER" },
      status: { code: overrides?.statusCode ?? "ACTIVE" },
    };
  }

  it("rejects active user when OpCo is inactive", async () => {
    mockedUserFindFirst.mockResolvedValueOnce(activeOpcoUser());
    mockedOpcoFindFirst.mockResolvedValueOnce({
      status: { code: "INACTIVE" },
    });

    await expect(loadActiveAuthUser("10")).resolves.toBeNull();
  });

  it("allows active user when OpCo is active", async () => {
    mockedUserFindFirst.mockResolvedValueOnce(activeOpcoUser());
    mockedOpcoFindFirst.mockResolvedValueOnce({
      status: { code: "ACTIVE" },
    });

    await expect(loadActiveAuthUser("10")).resolves.toMatchObject({
      id: "10",
      role: "opco",
      opcoId: "1",
    });
  });

  it("rejects inactive user even when OpCo is active", async () => {
    mockedUserFindFirst.mockResolvedValueOnce(
      activeOpcoUser({ statusCode: "INACTIVE" }),
    );

    await expect(loadActiveAuthUser("10")).resolves.toBeNull();
    expect(mockedOpcoFindFirst).not.toHaveBeenCalled();
  });

  it("rejects active user when Partner is inactive", async () => {
    mockedUserFindFirst.mockResolvedValueOnce(activePartnerUser());
    mockedPartnerFindFirst.mockResolvedValueOnce({
      status: { code: "INACTIVE" },
    });

    await expect(loadActiveAuthUser("20")).resolves.toBeNull();
  });

  it("allows active user when Partner is active", async () => {
    mockedUserFindFirst.mockResolvedValueOnce(activePartnerUser());
    mockedPartnerFindFirst.mockResolvedValueOnce({
      status: { code: "ACTIVE" },
    });

    await expect(loadActiveAuthUser("20")).resolves.toMatchObject({
      id: "20",
      role: "partner",
      partnerId: "2",
    });
  });

  it("rejects inactive partner user even when Partner org is active", async () => {
    mockedUserFindFirst.mockResolvedValueOnce(
      activePartnerUser({ statusCode: "SUSPENDED" }),
    );

    await expect(loadActiveAuthUser("20")).resolves.toBeNull();
    expect(mockedPartnerFindFirst).not.toHaveBeenCalled();
  });
});
