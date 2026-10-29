/**
 * GET — list partners with invoice-upload flags (search, status, sort, page).
 * PATCH — bulk open/close invoice upload for partners matching filters.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  bulkSetPartnerInvoiceUploadEnabled,
  listPartnerInvoiceAccess,
  parsePartnerInvoiceAccessFilters,
} from "@/lib/dizlee/partner-invoice-access";

const bulkBodySchema = z.object({
  enabled: z.boolean(),
  search: z.string().optional(),
  status: z.enum(["all", "open", "closed"]).optional(),
});

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const filters = parsePartnerInvoiceAccessFilters(request.nextUrl.searchParams);
    const data = await listPartnerInvoiceAccess(filters);
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const json = await request.json();
    const parsed = bulkBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data = await bulkSetPartnerInvoiceUploadEnabled({
      enabled: parsed.data.enabled,
      search: parsed.data.search,
      status: parsed.data.status,
      actorUserId: user.id,
    });
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
