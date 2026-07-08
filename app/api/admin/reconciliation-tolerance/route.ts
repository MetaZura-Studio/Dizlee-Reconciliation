import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  getReconciliationTolerance,
  ReconciliationToleranceError,
  updateReconciliationTolerance,
} from "@/lib/admin/reconciliation-tolerance";
import type { UpdateReconciliationToleranceInput } from "@/lib/admin/validation/reconciliation-tolerance";

export async function GET() {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await getReconciliationTolerance();
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof ReconciliationToleranceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load reconciliation tolerance";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as UpdateReconciliationToleranceInput;
    const data = await updateReconciliationTolerance(body, BigInt(user.id));
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof ReconciliationToleranceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error
        ? error.message
        : "Failed to save reconciliation tolerance";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
