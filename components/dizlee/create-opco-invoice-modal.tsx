"use client";

import { useEffect, useState } from "react";

import { DizleeOpcoInvoiceDocument } from "@/components/shared/dizlee-opco-invoice-document";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type {
  CreateOpcoInvoiceFormOptions,
  CreateOpcoInvoiceInput,
  CreateOpcoInvoiceLineInput,
} from "@/lib/dizlee/invoices";
import type { InvoiceBankDetails } from "@/lib/dizlee/invoice-bank-details";
import { ui } from "@/lib/ui/classes";
import {
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";

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

type Step = "edit" | "preview";

function toBankDetails(
  account: CreateOpcoInvoiceFormOptions["bankAccounts"][number] | null | undefined,
): InvoiceBankDetails | null {
  if (!account) {
    return null;
  }
  return {
    bankName: account.bankName,
    accountName: account.accountName,
    accountNumber: account.accountNumber,
    iban: account.iban,
    swift: account.swift,
    reference: account.reference,
  };
}

export function CreateOpcoInvoiceModal(props: CreateOpcoInvoiceModalProps) {
  if (!props.open) {
    return null;
  }

  return (
    <CreateOpcoInvoiceModalInner
      key={`${props.defaultMonth}-${props.defaultYear}`}
      {...props}
    />
  );
}

function CreateOpcoInvoiceModalInner({
  defaultMonth,
  defaultYear,
  onClose,
  onCreated,
}: CreateOpcoInvoiceModalProps) {
  const [step, setStep] = useState<Step>("edit");
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
  const [preparedBy, setPreparedBy] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [lineItems, setLineItems] = useState<CreateOpcoInvoiceLineInput[]>([
    emptyLine(),
  ]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/dizlee/invoices?form=create")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load form options");
        }
        if (cancelled) {
          return;
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
        if (cancelled) {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load form options",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const selectedBank =
    formOptions?.bankAccounts.find((account) => account.id === bankAccountId) ??
    (formOptions?.bankAccounts.length === 1 ? formOptions.bankAccounts[0] : null);

  const selectedOpco = formOptions?.opcos.find((row) => row.id === opcoId) ?? null;
  const selectedCurrency =
    formOptions?.currencies.find((row) => row.id === currencyId) ?? null;

  const validateForPreview = (): string | null => {
    if (!opcoId) {
      return "Select an OpCo.";
    }
    if (!currencyId) {
      return "Select a currency.";
    }
    if (formOptions && formOptions.bankAccounts.length > 1 && !bankAccountId) {
      return "Select a bank account.";
    }
    if (!preparedBy.trim()) {
      return "Prepared by is required.";
    }
    if (!approvedBy.trim()) {
      return "Approved by is required.";
    }
    if (lineItems.length === 0) {
      return "Add at least one line item.";
    }
    for (const [index, line] of lineItems.entries()) {
      if (!line.description.trim()) {
        return `Line ${index + 1}: description is required.`;
      }
      if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
        return `Line ${index + 1}: number must be greater than 0.`;
      }
      if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
        return `Line ${index + 1}: amount must be 0 or greater.`;
      }
    }
    return null;
  };

  const goToPreview = () => {
    const validationError = validateForPreview();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep("preview");
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
        preparedBy: preparedBy.trim(),
        approvedBy: approvedBy.trim(),
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

  const yearOptions = getPeriodYearOptions();
  const maxMonth = getMaxMonthForYear(year);

  const isPreview = step === "preview";

  return (
    <Modal
      open
      title={isPreview ? "Preview invoice" : "Create invoice to OpCo"}
      onClose={onClose}
      wide
      className={isPreview ? "max-w-6xl p-8" : "max-w-2xl"}
    >
      {!isPreview ? (
        <p className="mb-4 text-sm text-foreground-muted">
          Digital Dizlee → OpCo invoice for the selected period.
        </p>
      ) : null}

      {loadingOptions ? (
        <p className="text-sm text-foreground-subtle">Loading form…</p>
      ) : isPreview ? (
        <div className="space-y-4">
          <DizleeOpcoInvoiceDocument
            invoiceNumber="INV-DRAFT"
            issuedAt={new Date().toISOString()}
            billedPartyName={selectedOpco?.name ?? "—"}
            currencyCode={selectedCurrency?.isoCode ?? "USD"}
            lineItems={lineItems.map((line) => ({
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: line.quantity * line.unitPrice,
            }))}
            bankDetails={toBankDetails(selectedBank)}
            preparedBy={preparedBy}
            approvedBy={approvedBy}
          />
          {error ? <p className={ui.alertError}>{error}</p> : null}
          <div className="flex justify-end gap-3 print:hidden">
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => {
                setError(null);
                setStep("edit");
              }}
            >
              Back to edit
            </Button>
            <Button
              type="button"
              disabled={submitting || !opcoId}
              onClick={() => void submit()}
            >
              {submitting ? "Sending…" : "Confirm & send"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="create-invoice-month" required>Month</FieldLabel>
              <Select
                id="create-invoice-month"
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
              >
                {MONTHS.slice(0, maxMonth).map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="create-invoice-year" required>Year</FieldLabel>
              <Select
                id="create-invoice-year"
                value={year}
                onChange={(event) => {
                const nextYear = Number(event.target.value);
                setYear(nextYear);
                const capped = getMaxMonthForYear(nextYear);
                if (month > capped) setMonth(capped);
              }}
              >
                {yearOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="create-invoice-opco" required>OpCo</FieldLabel>
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
              <FieldLabel htmlFor="create-invoice-currency" required>Currency</FieldLabel>
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
                <FieldLabel htmlFor="create-invoice-bank" required>Bank account</FieldLabel>
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
              {selectedBank ? (
                <div className="rounded-md border border-border bg-surface-muted p-3 text-sm text-foreground-muted">
                  <dl className="grid gap-1 sm:grid-cols-2">
                    {selectedBank.bankName ? (
                      <div>
                        <dt className="text-xs text-foreground-subtle">Bank</dt>
                        <dd>{selectedBank.bankName}</dd>
                      </div>
                    ) : null}
                    {selectedBank.accountName ? (
                      <div>
                        <dt className="text-xs text-foreground-subtle">
                          Account name
                        </dt>
                        <dd>{selectedBank.accountName}</dd>
                      </div>
                    ) : null}
                    {selectedBank.iban ? (
                      <div>
                        <dt className="text-xs text-foreground-subtle">IBAN</dt>
                        <dd>{selectedBank.iban}</dd>
                      </div>
                    ) : null}
                    {selectedBank.swift ? (
                      <div>
                        <dt className="text-xs text-foreground-subtle">SWIFT</dt>
                        <dd>{selectedBank.swift}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="create-invoice-prepared-by" required>
                Prepared by
              </FieldLabel>
              <Input
                id="create-invoice-prepared-by"
                value={preparedBy}
                onChange={(event) => setPreparedBy(event.target.value)}
                placeholder="Name"
              />
            </div>
            <div>
              <FieldLabel htmlFor="create-invoice-approved-by" required>
                Approved by
              </FieldLabel>
              <Input
                id="create-invoice-approved-by"
                value={approvedBy}
                onChange={(event) => setApprovedBy(event.target.value)}
                placeholder="Name"
              />
            </div>
          </div>

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
                <div className="space-y-1 sm:col-span-2">
                  <FieldLabel required>Description</FieldLabel>
                  <Input
                    value={line.description}
                    onChange={(event) =>
                      updateLine(index, "description", event.target.value)
                    }
                    placeholder="Description"
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel required>Number</FieldLabel>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={line.quantity}
                    onChange={(event) =>
                      updateLine(index, "quantity", event.target.value)
                    }
                    placeholder="e.g. 1"
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel required>Amount</FieldLabel>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={line.unitPrice}
                    onChange={(event) =>
                      updateLine(index, "unitPrice", event.target.value)
                    }
                    placeholder="Amount"
                  />
                </div>
              </div>
            ))}
            <p className={ui.hint}>
              Number × Amount is the line total (e.g. 2 × 10.50 = 21.00).
            </p>
          </div>

          {error ? <p className={ui.alertError}>{error}</p> : null}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" disabled={!opcoId} onClick={goToPreview}>
              Preview invoice
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
