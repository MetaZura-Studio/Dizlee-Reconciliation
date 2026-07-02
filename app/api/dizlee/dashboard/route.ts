import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  currentPeriod,
  getDashboardData,
  type DashboardPeriod,
} from "@/lib/dizlee/dashboard";

function parsePeriod(request: NextRequest): DashboardPeriod {
  const fallback = currentPeriod();
  const { searchParams } = new URL(request.url);

  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));

  const validMonth =
    Number.isInteger(month) && month >= 1 && month <= 12 ? month : fallback.month;
  const validYear =
    Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : fallback.year;

  return {
    month: validMonth,
    year: validYear,
    label: new Date(validYear, validMonth - 1, 1).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    }),
  };
}

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await getDashboardData(parsePeriod(request));
    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load dashboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
