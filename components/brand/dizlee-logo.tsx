import Image from "next/image";

import { cn } from "@/lib/ui/classes";

export const DIZLEE_LOGO_SRC = "/dizlee-logo.png";

type DizleeLogoProps = {
  /** `full` shows the wordmark; `mark` crops to the D icon for compact sidebars. */
  variant?: "full" | "mark";
  className?: string;
  priority?: boolean;
};

export function DizleeLogo({
  variant = "full",
  className,
  priority = false,
}: DizleeLogoProps) {
  if (variant === "mark") {
    return (
      <span
        className={cn(
          "inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-2xl bg-transparent",
          className,
        )}
      >
        <Image
          src={DIZLEE_LOGO_SRC}
          alt="Dizlee"
          width={80}
          height={80}
          className="h-full w-full object-cover object-left"
          priority={priority}
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex h-9 max-w-full items-center overflow-hidden rounded-xl bg-transparent",
        className,
      )}
    >
      <Image
        src={DIZLEE_LOGO_SRC}
        alt="Dizlee"
        width={160}
        height={36}
        className="h-7 w-auto max-w-[9.5rem] object-contain object-left"
        priority={priority}
      />
    </span>
  );
}
