import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn, ui } from "@/lib/ui/classes";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const variantClass: Record<ButtonVariant, string> = {
  primary: ui.btnPrimary,
  secondary: ui.btnSecondary,
  danger: ui.btnDanger,
  ghost: ui.btnGhost,
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={cn(variantClass[variant], className)} {...props}>
      {children}
    </button>
  );
}
