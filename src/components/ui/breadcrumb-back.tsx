import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const backClass =
  "cursor-pointer hover:underline hover:decoration-[#0A0A0A] hover:underline-offset-[3px]";

/** Parent crumb that returns to the artifacts list. */
export function BreadcrumbBack({
  href,
  onClick,
  className,
  children,
}: {
  href?: string;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}) {
  if (href) {
    return (
      <Link data-design-id="m-694d8c83abba" href={href} className={cn(backClass, className)}>
        {children}
      </Link>
    );
  }

  return (
    <button data-design-id="m-0ddc5015c80c" type="button" onClick={onClick} className={cn(backClass, className)}>
      {children}
    </button>
  );
}
