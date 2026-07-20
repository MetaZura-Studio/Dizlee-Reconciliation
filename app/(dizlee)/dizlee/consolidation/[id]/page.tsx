import { notFound } from "next/navigation";

import { ConsolidationResultView } from "@/components/dizlee/consolidation-result-view";
import { getConsolidationDetail } from "@/lib/dizlee/consolidation";

type ConsolidationResultPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ConsolidationResultPage({
  params,
}: ConsolidationResultPageProps) {
  const { id } = await params;
  const consolidationId = Number(id);

  if (!Number.isInteger(consolidationId) || consolidationId < 1) {
    notFound();
  }

  const detail = await getConsolidationDetail(consolidationId);
  if (!detail) {
    notFound();
  }

  return <ConsolidationResultView initialDetail={detail} />;
}
