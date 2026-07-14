import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn, ui } from "@/lib/ui/classes";

type IconButtonVariant = "default" | "primary" | "danger";

const variantClass: Record<IconButtonVariant, string> = {
  default: ui.iconButton,
  primary: ui.iconButtonPrimary,
  danger: ui.iconButtonDanger,
};

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  variant?: IconButtonVariant;
  children: ReactNode;
};

export function IconButton({
  label,
  variant = "default",
  className,
  children,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      className={cn(variantClass[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}
