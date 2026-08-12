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
import {
  convertInvoiceLinesToUsd,
  resolveRateToUsd,
} from "@/lib/dizlee/invoice-usd-copy";
import { ui } from "@/lib/ui/classes";
import {
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import { formatAppError } from "@/lib/errors/format";

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

type CurrencyCopyMode = "local_only" | "local_and_usd";

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
  const [currencyCopyMode, setCurrencyCopyMode] =
    useState<CurrencyCopyMode>("local_only");
  const [preparedBy, setPreparedBy] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [lineItems, setLineItems] = useState<CreateOpcoInvoiceLineInput[]>([
    emptyLine(),
  ]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      form: "create",
      month: String(month),
      year: String(year),
    });
    void fetch(`/api/dizlee/invoices?${params.toString()}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(formatAppError(payload, "Failed to load form options"));
        }
        if (cancelled) {
          return;
        }
        const options = payload.data as CreateOpcoInvoiceFormOptions;
        setFormOptions(options);
        setOpcoId((current) => {
          if (current && options.opcos.some((opco) => opco.id === current)) {
            return current;
          }
          return options.opcos[0]?.id ?? "";
        });
        setCurrencyId((current) => {
          if (current && options.currencies.some((row) => row.id === current)) {
            return current;
          }
          const firstOpco = options.opcos[0];
          return firstOpco?.defaultCurrencyId ?? options.currencies[0]?.id ?? "";
        });
        if (options.bankAccounts.length === 1) {
          setBankAccountId(options.bankAccounts[0].id);
        } else if (options.bankAccounts.length > 1) {
          const defaultAccount =
            options.bankAccounts.find((account) => account.isDefault) ??
            options.bankAccounts[0];
          setBankAccountId(defaultAccount.id);
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
  }, [month, year]);

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
  const isUsdCurrency = selectedCurrency?.isoCode === "USD";
  const effectiveCopyMode: CurrencyCopyMode = isUsdCurrency
    ? "local_only"
    : currencyCopyMode;
  const rateToUsd =
    selectedCurrency && formOptions
      ? resolveRateToUsd({
          currencyId: selectedCurrency.id,
          currencyIso: selectedCurrency.isoCode,
          fxRates: formOptions.fxRates,
        })
      : null;

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
    if (effectiveCopyMode === "local_and_usd" && rateToUsd === null) {
      return `No USD conversion rate found for ${selectedCurrency?.isoCode ?? "this currency"} in ${MONTHS[month - 1]} ${year}. Add it under Admin → Currencies.`;
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
        throw new Error(formatAppError(payload, "Failed to create invoice"));
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
  const previewLines = lineItems.map((line) => ({
    description: line.description,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    lineTotal: line.quantity * line.unitPrice,
  }));
  const usdPreviewLines =
    effectiveCopyMode === "local_and_usd" && rateToUsd !== null
      ? convertInvoiceLinesToUsd(previewLines, rateToUsd)
      : null;

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
          <div className="space-y-0">
            <section className="rounded-lg border-2 border-zinc-900 bg-white p-4 sm:p-6 print:rounded-none print:border-0 print:p-0">
              <div className="mb-4 border-b-2 border-zinc-900 pb-3 print:mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Invoice 1 of {usdPreviewLines ? 2 : 1}
                </p>
                <p className="mt-1 text-base font-semibold text-zinc-900">
                  Local currency
                  {selectedCurrency?.isoCode
                    ? ` (${selectedCurrency.isoCode})`
                    : ""}
                </p>
              </div>
              <DizleeOpcoInvoiceDocument
                invoiceNumber="INV-DRAFT"
                issuedAt={new Date().toISOString()}
                billedPartyName={selectedOpco?.name ?? "—"}
                currencyCode={selectedCurrency?.isoCode ?? "USD"}
                lineItems={previewLines}
                bankDetails={toBankDetails(selectedBank)}
                preparedBy={preparedBy}
                approvedBy={approvedBy}
              />
            </section>

            {usdPreviewLines ? (
              <>
                <div
                  className="my-6 flex items-center gap-3 print:hidden"
                  aria-hidden
                >
                  <div className="h-px flex-1 bg-zinc-900" />
                  <span className="shrink-0 rounded-full border border-zinc-900 bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-800">
                    Next: USD equivalent
                  </span>
                  <div className="h-px flex-1 bg-zinc-900" />
                </div>

                <section className="rounded-lg border-2 border-zinc-900 bg-white p-4 sm:p-6 print:break-before-page print:rounded-none print:border-0 print:p-0">
                  <div className="mb-4 border-b-2 border-zinc-900 pb-3 print:mb-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      Invoice 2 of 2
                    </p>
                    <p className="mt-1 text-base font-semibold text-zinc-900">
                      USD equivalent
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">
                      Converted from {selectedCurrency?.isoCode ?? "local"} using
                      rate {rateToUsd} ({MONTHS[month - 1]} {year})
                    </p>
                  </div>
                  <DizleeOpcoInvoiceDocument
                    invoiceNumber="INV-DRAFT"
                    issuedAt={new Date().toISOString()}
                    billedPartyName={selectedOpco?.name ?? "—"}
                    currencyCode="USD"
                    lineItems={usdPreviewLines}
                    bankDetails={toBankDetails(selectedBank)}
                    preparedBy={preparedBy}
                    approvedBy={approvedBy}
                  />
                </section>
              </>
            ) : null}
          </div>
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
                onChange={(event) => {
                  setLoadingOptions(true);
                  setMonth(Number(event.target.value));
                }}
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
                  setLoadingOptions(true);
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
                onChange={(event) => {
                  setCurrencyId(event.target.value);
                  const next = formOptions?.currencies.find(
                    (currency) => currency.id === event.target.value,
                  );
                  if (next?.isoCode === "USD") {
                    setCurrencyCopyMode("local_only");
                  }
                }}
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

          {!isUsdCurrency ? (
            <fieldset className="space-y-2 rounded-md border border-border p-3">
              <legend className="px-1 text-sm font-medium text-foreground">
                Invoice currency copy
              </legend>
              <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground-muted">
                <input
                  type="radio"
                  name="currency-copy-mode"
                  className="mt-1"
                  checked={currencyCopyMode === "local_only"}
                  onChange={() => setCurrencyCopyMode("local_only")}
                />
                <span>
                  <span className="font-medium text-foreground">
                    Local currency only
                  </span>
                  <span className="mt-0.5 block text-xs text-foreground-subtle">
                    PDF shows one invoice in the selected currency.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground-muted">
                <input
                  type="radio"
                  name="currency-copy-mode"
                  className="mt-1"
                  checked={currencyCopyMode === "local_and_usd"}
                  onChange={() => setCurrencyCopyMode("local_and_usd")}
                />
                <span>
                  <span className="font-medium text-foreground">
                    Local currency + USD
                  </span>
                  <span className="mt-0.5 block text-xs text-foreground-subtle">
                    Same PDF includes a second page converted to USD using the
                    period FX rate
                    {rateToUsd !== null ? ` (current rate ${rateToUsd})` : ""}.
                  </span>
                </span>
              </label>
              {currencyCopyMode === "local_and_usd" && rateToUsd === null ? (
                <p className={ui.alertWarning}>
                  No USD rate for {selectedCurrency?.isoCode} in{" "}
                  {MONTHS[month - 1]} {year}. Add it under Admin → Currencies
                  before previewing.
                </p>
              ) : null}
            </fieldset>
          ) : null}

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
                  {formOptions.bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.label}
                      {account.isDefault ? " (default)" : ""}
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
