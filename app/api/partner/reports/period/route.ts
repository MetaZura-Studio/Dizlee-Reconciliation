/**
 * GET — Partner portal.
 * Period report status for Upload Report early gate (exists / request / reupload).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { getPartnerSession } from "@/lib/partner/auth";
import { isOpcoLinkedToPartner } from "@/lib/partner/queries/opcos";
import { getPartnerReportForPeriod } from "@/lib/partner/queries/reports";

export async function GET(request: NextRequest) {
  const session = await getPartnerSession();
  if (!session) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    const opcoIdRaw = searchParams.get("opcoId")?.trim() ?? "";
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));

    if (!/^\d+$/.test(opcoIdRaw)) {
      return NextResponse.json({ error: "Invalid opcoId" }, { status: 400 });
    }

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        { error: "Invalid year or month" },
        { status: 400 },
      );
    }

    const partnerId = BigInt(session.partnerId);
    const opcoId = BigInt(opcoIdRaw);

    const linked = await isOpcoLinkedToPartner(partnerId, opcoId);
    if (!linked) {
      return NextResponse.json(
        { error: "OpCo is not linked to this partner" },
        { status: 403 },
      );
    }

    const data = await getPartnerReportForPeriod(
      partnerId,
      opcoId,
      year,
      month,
    );
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
