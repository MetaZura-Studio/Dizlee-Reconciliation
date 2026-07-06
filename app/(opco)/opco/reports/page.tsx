import { ReportsList } from "@/components/opco/ReportsList";
import { requireOpcoSession } from "@/lib/opco/auth";

export default async function OpcoReportsPage() {
  await requireOpcoSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports history</h1>
        <p className="mt-1 text-zinc-600">
          View submitted reports and request a reupload when corrections are needed.
        </p>
      </div>

      <ReportsList />
    </div>
  );
}
