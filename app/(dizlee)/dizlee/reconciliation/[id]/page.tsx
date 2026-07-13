import { notFound } from "next/navigation";

import { ReconciliationResultView } from "@/components/dizlee/reconciliation-result-view";
import { getReconciliationDetail } from "@/lib/dizlee/reconciliation";

type ReconciliationResultPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReconciliationResultPage({
  params,
}: ReconciliationResultPageProps) {
  const { id } = await params;
  const reconciliationId = Number(id);

  if (!Number.isInteger(reconciliationId) || reconciliationId < 1) {
    notFound();
  }

  const detail = await getReconciliationDetail(reconciliationId);
  if (!detail) {
    notFound();
  }

  return <ReconciliationResultView initialDetail={detail} />;
}
