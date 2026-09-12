import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PlatedButton({
  children,
  className,
  faceClassName,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  faceClassName?: string;
}) {
  return (
    <button type={type} className={cn("plated relative", className)} {...props}>
      <span aria-hidden className="plated-plate" />
      <span className={cn("plated-face", faceClassName)}>
        {children}
      </span>
    </button>
  );
}
