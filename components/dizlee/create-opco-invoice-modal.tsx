"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type {
  CreateOpcoInvoiceFormOptions,
  CreateOpcoInvoiceInput,
  CreateOpcoInvoiceLineInput,
} from "@/lib/dizlee/invoices";
import { ui } from "@/lib/ui/classes";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const emptyLine = (): CreateOpcoInvoiceLineInput => ({
  description: "",
  quantity: 1,
  unitPrice: 0,
});

type CreateOpcoInvoiceModalProps = {
  open: boolean;
  defaultMonth: number;
  defaultYear: number;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateOpcoInvoiceModal({
  open,
  defaultMonth,
  defaultYear,
  onClose,
  onCreated,
}: CreateOpcoInvoiceModalProps) {
  const [formOptions, setFormOptions] = useState<CreateOpcoInvoiceFormOptions | null>(
    null,
  );
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [opcoId, setOpcoId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [lineItems, setLineItems] = useState<CreateOpcoInvoiceLineInput[]>([
    emptyLine(),
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }
    void fetch("/api/dizlee/invoices?form=create")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load form options");
        }
        const options = payload.data as CreateOpcoInvoiceFormOptions;
        setFormOptions(options);
        if (options.opcos.length > 0) {
          const first = options.opcos[0];
          setOpcoId(first.id);
          setCurrencyId(first.defaultCurrencyId);
        }
        if (options.bankAccounts.length === 1) {
          setBankAccountId(options.bankAccounts[0].id);
        } else {
          setBankAccountId("");
        }
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load form options",
        );
      })
      .finally(() => setLoadingOptions(false));
  }, [open]);

  const handleOpcoChange = (nextOpcoId: string) => {
    setOpcoId(nextOpcoId);
    const opco = formOptions?.opcos.find((row) => row.id === nextOpcoId);
    if (opco) {
      setCurrencyId(opco.defaultCurrencyId);
    }
  };

  const updateLine = (
    index: number,
    field: keyof CreateOpcoInvoiceLineInput,
    value: string,
  ) => {
    setLineItems((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) {
          return line;
        }
        if (field === "description") {
          return { ...line, description: value };
        }
        return {
          ...line,
          [field]: Number(value),
        };
      }),
    );
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const body: CreateOpcoInvoiceInput = {
        month,
        year,
        opcoId,
        currencyId: currencyId || undefined,
        bankAccountId: bankAccountId || undefined,
        lineItems,
      };
      const response = await fetch("/api/dizlee/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create invoice");
      }
      onCreated();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to create invoice",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return null;
  }

  const yearOptions = [];
  for (let value = year + 1; value >= year - 4; value -= 1) {
    yearOptions.push(value);
  }

  const selectedBankPreview =
    formOptions?.bankAccounts.find((account) => account.id === bankAccountId) ??
    null;

  return (
    <Modal
      open={open}
      title="Create invoice to OpCo"
      onClose={onClose}
      wide
      className="max-w-2xl"
    >
      <p className="mb-4 text-sm text-foreground-muted">
        Digital Dizlee → OpCo invoice for the selected period.
      </p>

      {loadingOptions ? (
        <p className="text-sm text-foreground-subtle">Loading form…</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="create-invoice-month">Month</FieldLabel>
              <Select
                id="create-invoice-month"
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
              >
                {MONTHS.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="create-invoice-year">Year</FieldLabel>
              <Select
                id="create-invoice-year"
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
              >
                {yearOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="create-invoice-opco">OpCo</FieldLabel>
              <Select
                id="create-invoice-opco"
                value={opcoId}
                onChange={(event) => handleOpcoChange(event.target.value)}
              >
                {formOptions?.opcos.map((opco) => (
                  <option key={opco.id} value={opco.id}>
                    {opco.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="create-invoice-currency">Currency</FieldLabel>
              <Select
                id="create-invoice-currency"
                value={currencyId}
                onChange={(event) => setCurrencyId(event.target.value)}
              >
                {formOptions?.currencies.map((currency) => (
                  <option key={currency.id} value={currency.id}>
                    {currency.isoCode}
                    {currency.symbol ? ` (${currency.symbol})` : ""}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {formOptions && formOptions.bankAccounts.length === 0 ? (
            <p className={ui.alertWarning}>
              Bank details are not configured in admin settings yet.
            </p>
          ) : null}

          {formOptions && formOptions.bankAccounts.length === 1 ? (
            <div className="rounded-md border border-border bg-surface-muted p-3 text-sm text-foreground-muted">
              <p className="font-medium text-foreground">
                Bank details ({formOptions.bankAccounts[0].label})
              </p>
              <dl className="mt-2 grid gap-1 sm:grid-cols-2">
                {formOptions.bankAccounts[0].bankName ? (
                  <div>
                    <dt className="text-xs text-foreground-subtle">Bank</dt>
                    <dd>{formOptions.bankAccounts[0].bankName}</dd>
                  </div>
                ) : null}
                {formOptions.bankAccounts[0].accountName ? (
                  <div>
                    <dt className="text-xs text-foreground-subtle">Account name</dt>
                    <dd>{formOptions.bankAccounts[0].accountName}</dd>
                  </div>
                ) : null}
                {formOptions.bankAccounts[0].accountNumber ? (
                  <div>
                    <dt className="text-xs text-foreground-subtle">Account number</dt>
                    <dd>{formOptions.bankAccounts[0].accountNumber}</dd>
                  </div>
                ) : null}
                {formOptions.bankAccounts[0].iban ? (
                  <div>
                    <dt className="text-xs text-foreground-subtle">IBAN</dt>
                    <dd>{formOptions.bankAccounts[0].iban}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}

          {formOptions && formOptions.bankAccounts.length > 1 ? (
            <div className="space-y-3">
              <div>
                <FieldLabel htmlFor="create-invoice-bank">Bank account</FieldLabel>
                <Select
                  id="create-invoice-bank"
                  value={bankAccountId}
                  onChange={(event) => setBankAccountId(event.target.value)}
                >
                  <option value="">Select bank account</option>
                  {formOptions.bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.label}
                      {account.bankName ? ` — ${account.bankName}` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              {selectedBankPreview ? (
                <div className="rounded-md border border-border bg-surface-muted p-3 text-sm text-foreground-muted">
                  <dl className="grid gap-1 sm:grid-cols-2">
                    {selectedBankPreview.bankName ? (
                      <div>
                        <dt className="text-xs text-foreground-subtle">Bank</dt>
                        <dd>{selectedBankPreview.bankName}</dd>
                      </div>
                    ) : null}
                    {selectedBankPreview.accountName ? (
                      <div>
                        <dt className="text-xs text-foreground-subtle">
                          Account name
                        </dt>
                        <dd>{selectedBankPreview.accountName}</dd>
                      </div>
                    ) : null}
                    {selectedBankPreview.iban ? (
                      <div>
                        <dt className="text-xs text-foreground-subtle">IBAN</dt>
                        <dd>{selectedBankPreview.iban}</dd>
                      </div>
                    ) : null}
                    {selectedBankPreview.swift ? (
                      <div>
                        <dt className="text-xs text-foreground-subtle">SWIFT</dt>
                        <dd>{selectedBankPreview.swift}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground-muted">Line items</h3>
              <Button
                type="button"
                variant="ghost"
                className="h-auto px-0 text-sm underline"
                onClick={() => setLineItems((current) => [...current, emptyLine()])}
              >
                Add line
              </Button>
            </div>
            {lineItems.map((line, index) => (
              <div
                key={`line-${index}`}
                className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-4"
              >
                <Input
                  value={line.description}
                  onChange={(event) =>
                    updateLine(index, "description", event.target.value)
                  }
                  placeholder="Description"
                  className="sm:col-span-2"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.quantity}
                  onChange={(event) =>
                    updateLine(index, "quantity", event.target.value)
                  }
                  placeholder="Qty"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unitPrice}
                  onChange={(event) =>
                    updateLine(index, "unitPrice", event.target.value)
                  }
                  placeholder="Unit price"
                />
              </div>
            ))}
          </div>

          {error ? <p className={ui.alertError}>{error}</p> : null}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={submitting || !opcoId}
              onClick={() => void submit()}
            >
              {submitting ? "Creating…" : "Create invoice"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
