import { OpcoReportMappingForm } from "@/components/admin/opco-report-mapping-form";
import {
  getOpcoReportMapping,
  OpcoReportMappingError,
} from "@/lib/admin/opco-report-mappings";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOpcoReportMappingPage({ params }: PageProps) {
  const { id } = await params;

  try {
    const mapping = await getOpcoReportMapping(id);
    return (
      <div className="w-full">
        <OpcoReportMappingForm initialMapping={mapping} />
      </div>
    );
  } catch (error) {
    const message =
      error instanceof OpcoReportMappingError
        ? error.message
        : error instanceof Error && process.env.NODE_ENV === "development"
          ? error.message
          : "Report mapping could not be loaded.";
    return (
      <div className="w-full space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Report mapping</h1>
        <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {message}
        </p>
      </div>
    );
  }
}
