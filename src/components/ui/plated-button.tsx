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
    <button data-design-id="m-e01a4bb7972f" type={type} className={cn("plated relative", className)} {...props}>
      <span data-design-id="m-af4d93b2ef95" aria-hidden className="plated-plate" />
      <span data-design-id="m-604f616c2bf3" className={cn("plated-face", faceClassName)}>
        {children}
      </span>
    </button>
  );
}
