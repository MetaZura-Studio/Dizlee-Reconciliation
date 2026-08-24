import { notFound } from "next/navigation";

import { ReconciliationResultView } from "@/components/dizlee/reconciliation-result-view";
import { loadReconciliationAlertTemplates } from "@/lib/dizlee/notifications/reconciliation-alerts";
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

  const initialAlertTemplates = await loadReconciliationAlertTemplates(detail);

  return (
    <ReconciliationResultView
      key={`${detail.id}-${detail.runAt}`}
      initialDetail={detail}
      initialAlertTemplates={initialAlertTemplates}
    />
  );
}
