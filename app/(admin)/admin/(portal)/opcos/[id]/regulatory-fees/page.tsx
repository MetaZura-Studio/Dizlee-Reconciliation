import { OpcoRegulatoryFeesView } from "@/components/admin/opco-regulatory-fees-view";
import {
  getOpcoRegulatoryFeesPage,
  OpcoRegulatoryFeeError,
} from "@/lib/admin/opco-regulatory-fees";

type PageProps = {
  params: Promise<{ id: string }>;
};

function loadErrorMessage(error: unknown): string {
  if (error instanceof OpcoRegulatoryFeeError) {
    return error.message;
  }
  if (error instanceof Error && process.env.NODE_ENV === "development") {
    return error.message;
  }
  return "Regulatory fees could not be loaded.";
}

export default async function AdminOpcoRegulatoryFeesPage({ params }: PageProps) {
  const { id } = await params;

  try {
    const page = await getOpcoRegulatoryFeesPage(id);
    return (
      <div className="w-full">
        <OpcoRegulatoryFeesView initialPage={page} />
      </div>
    );
  } catch (error) {
    return (
      <div className="w-full space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Regulatory fees</h1>
        <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {loadErrorMessage(error)}
        </p>
      </div>
    );
  }
}
