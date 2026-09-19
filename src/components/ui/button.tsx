import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "subtle" | "ghost" | "danger";
type ButtonSize = "l" | "m" | "s";

const HEIGHTS: Record<ButtonSize, string> = {
  l: "h-11 px-5 text-[15px] leading-5",
  m: "h-10 px-5 text-sm leading-[18px]",
  s: "h-[30px] px-3 text-xs leading-4",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-[#141414] text-white hover:bg-[#000000] disabled:opacity-35",
  secondary:
    "border border-[#E6E6E6] bg-white text-[#0A0A0A] hover:bg-[#FAFAFA]",
  subtle: "bg-[#F5F5F5] text-[#0A0A0A] hover:bg-[#EFEFEF]",
  ghost: "text-[#5E5E5E] hover:bg-[#F7F7F5]",
  danger:
    "border border-[#B42318] bg-white text-[#B42318] hover:bg-[#FDF2F1]",
};

export function Button({
  variant = "primary",
  size = "m",
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}) {
  return (
    <button data-design-id="m-75e600493ebe"
      type={type}
      disabled={disabled}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:pointer-events-none",
        HEIGHTS[size],
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
