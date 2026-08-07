/**
 * Form field primitives: labeled inputs, selects, required marker, and grouped checkbox headings.
 */

import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes } from "react";

import { cn, ui } from "@/lib/ui/classes";

export function RequiredMark() {
  return (
    <span className="text-danger" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(ui.input, className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(ui.select, className)} {...props}>
      {children}
    </select>
  );
}

type FieldLabelProps = {
  children: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  className?: string;
} & Pick<LabelHTMLAttributes<HTMLLabelElement>, "id">;

export function FieldLabel({
  children,
  htmlFor,
  required,
  className,
  id,
}: FieldLabelProps) {
  return (
    <label htmlFor={htmlFor} id={id} className={cn(ui.label, className)}>
      {children}
      {required ? <RequiredMark /> : null}
    </label>
  );
}

/** Label styled like FieldLabel but for non-`<label>` group headings (e.g. checkbox lists). */
export function FieldLegend({
  children,
  required,
  className,
}: {
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <span className={cn(ui.label, className)}>
      {children}
      {required ? <RequiredMark /> : null}
    </span>
  );
}
