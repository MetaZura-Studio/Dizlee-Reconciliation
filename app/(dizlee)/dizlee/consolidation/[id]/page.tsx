import { redirect } from "next/navigation";

/** Consolidation UI is hidden for now; restore the previous page body when re-enabling. */
export default function ConsolidationResultPage() {
  redirect("/dizlee");
}
