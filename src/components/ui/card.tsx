import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-design-id="m-602ffac80062"
      className={cn(
        "rounded-xl border border-[#E8E8E6] bg-white shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
