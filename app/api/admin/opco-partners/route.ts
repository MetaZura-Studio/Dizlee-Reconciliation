/**
 * GET, PATCH — Admin portal.
 * List OpCo–partner assignments or update linkage settings.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  getOpcoPartnerLinksPageData,
  getPartnerLinksForOpco,
  OpcoPartnerLinksError,
  savePartnerLinksForOpco,
} from "@/lib/admin/opco-partner-links";
import type { SaveOpcoPartnerLinksInput } from "@/lib/admin/validation/opco-partner-links";

export async function GET(request: NextRequest) {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    if (error instanceof OpcoPartnerLinksError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to load OpCo partner links";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as SaveOpcoPartnerLinksInput;
    const data = await savePartnerLinksForOpco(body, BigInt(user.id));
    return NextResponse.json({ data, message: "Partner links saved." });
  } catch (error) {
    if (error instanceof OpcoPartnerLinksError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to save partner links";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
