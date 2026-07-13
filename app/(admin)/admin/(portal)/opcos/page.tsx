import { OpcosView } from "@/components/admin/opcos-view";
import { listCurrencies } from "@/lib/admin/currencies";
import { listOpcos, OpcoActionError } from "@/lib/admin/opcos";

export default async function AdminOpcosPage() {
  try {
    const [opcos, currencies] = await Promise.all([
      listOpcos(),
      listCurrencies(),
    ]);

    return (
      <div className="mx-auto max-w-5xl">
        <OpcosView initialOpcos={opcos} currencies={currencies} />
      </div>
    );
  } catch (error) {
    const message =
      error instanceof OpcoActionError
        ? error.message
        : "OpCos could not be loaded.";

    return (
      <div className="mx-auto max-w-5xl space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">OpCos</h1>
        <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {message}
        </p>
      </div>
    );
  }
}
