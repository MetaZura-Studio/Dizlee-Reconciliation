import { OpcoReportMappingForm } from "@/components/admin/opco-report-mapping-form";
import {
  getOpcoReportMapping,
  getOpcoReportMappingColumnValues,
  OpcoReportMappingError,
} from "@/lib/admin/opco-report-mappings";

type PageProps = {
  params: Promise<{ id: string }>;
};

function reportMappingLoadErrorMessage(error: unknown): string {
  if (error instanceof OpcoReportMappingError) {
    return error.message;
  }
  if (error instanceof Error && process.env.NODE_ENV === "development") {
    return error.message;
  }
  return "Report mapping could not be loaded.";
}

export default async function AdminOpcoReportMappingPage({ params }: PageProps) {
  const { id } = await params;

  let mapping;
  const initialFilterValuesByColumn: Record<string, string[]> = {};
  try {
    mapping = await getOpcoReportMapping(id);
    if (mapping.sampleFileName) {
      for (const filter of mapping.rowFilters) {
        if (initialFilterValuesByColumn[filter.column]) {
          continue;
        }
        try {
          const result = await getOpcoReportMappingColumnValues(
            id,
            filter.column,
          );
          initialFilterValuesByColumn[filter.column] = result.values;
        } catch {
          initialFilterValuesByColumn[filter.column] = [];
        }
      }
    }
  } catch (error) {
    return (
      <div className="w-full space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Report mapping</h1>
        <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {reportMappingLoadErrorMessage(error)}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <OpcoReportMappingForm
        initialMapping={mapping}
        initialFilterValuesByColumn={initialFilterValuesByColumn}
      />
    </div>
  );
}
