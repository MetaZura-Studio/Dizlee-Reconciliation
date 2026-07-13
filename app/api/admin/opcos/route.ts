import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  createOpco,
  listOpcos,
  OpcoActionError,
} from "@/lib/admin/opcos";
import type { CreateOpcoInput } from "@/lib/admin/validation/opcos";

export async function GET() {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const opcos = await listOpcos();
    return NextResponse.json({ data: { opcos } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load OpCos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CreateOpcoInput;
    const opco = await createOpco(body, BigInt(user.id));
    return NextResponse.json({ data: opco }, { status: 201 });
  } catch (error) {
    if (error instanceof OpcoActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to create OpCo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
