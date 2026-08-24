import { OpcoReportMappingForm } from "@/components/admin/opco-report-mapping-form";
import {
  getOpcoReportMapping,
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
  try {
    mapping = await getOpcoReportMapping(id);
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
      <OpcoReportMappingForm initialMapping={mapping} />
    </div>
  );
}
