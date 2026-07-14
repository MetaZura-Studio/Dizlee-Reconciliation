import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

import { cn, ui } from "@/lib/ui/classes";

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

export function FieldLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={ui.label}>
      {children}
    </label>
  );
}
