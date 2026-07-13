import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  createPartner,
  listPartners,
  PartnerActionError,
} from "@/lib/admin/partners";
import type { CreatePartnerInput } from "@/lib/admin/validation/partners";

export async function GET() {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const partners = await listPartners();
    return NextResponse.json({ data: { partners } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Partners";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CreatePartnerInput;
    const partner = await createPartner(body, BigInt(user.id));
    return NextResponse.json({ data: partner }, { status: 201 });
  } catch (error) {
    if (error instanceof PartnerActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to create Partner";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
