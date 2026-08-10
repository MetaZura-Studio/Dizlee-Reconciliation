/**
 * GET — Dizlee portal.
 * Return KPI and summary metrics for the Dizlee home dashboard.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

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

  let validMonth =
    Number.isInteger(month) && month >= 1 && month <= 12
      ? month
      : fallback.month;
  const validYear =
    Number.isInteger(year) && year >= 2000 && year <= fallback.year
      ? year
      : fallback.year;

  if (validYear === fallback.year && validMonth > fallback.month) {
    validMonth = fallback.month;
  }

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
    return unauthorized();
  }

  try {
    const data = await getDashboardData(parsePeriod(request));
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
