/**
 * GET, PATCH — Admin portal.
 * List OpCo–partner assignments or update linkage settings.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  getOpcoPartnerLinksPageData,
  getPartnerLinksForOpco,
  savePartnerLinksForOpco,
} from "@/lib/admin/opco-partner-links";
import type { SaveOpcoPartnerLinksInput } from "@/lib/admin/validation/opco-partner-links";

export async function GET(request: NextRequest) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);

    if (searchParams.get("list") === "opcos") {
      const data = await getOpcoPartnerLinksPageData();
      return NextResponse.json({ data: { opcos: data.opcos } });
    }

    const opcoId = searchParams.get("opcoId");
    if (!opcoId) {
      const data = await getOpcoPartnerLinksPageData();
      return NextResponse.json({ data });
    }

    const links = await getPartnerLinksForOpco(opcoId);
    return NextResponse.json({ data: links });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const body = (await request.json()) as SaveOpcoPartnerLinksInput;
    const data = await savePartnerLinksForOpco(body, BigInt(user.id));
    return NextResponse.json({ data, message: "Partner links saved." });
  } catch (error) {
    return jsonError(error);
  }
}
