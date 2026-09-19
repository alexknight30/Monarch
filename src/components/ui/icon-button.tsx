import type { ButtonHTMLAttributes, ComponentType } from "react";
import { cn } from "@/lib/utils";

type IconButtonSize = "l" | "m" | "s";

const BOX: Record<IconButtonSize, number> = {
  l: 72,
  m: 30,
  s: 28,
};

export type AnimatedIconProps = {
  size?: number;
  className?: string;
};

export function IconButton({
  icon: Icon,
  label,
  size = "m",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ComponentType<AnimatedIconProps>;
  label: string;
  size?: IconButtonSize;
}) {
  const box = BOX[size];
  const iconSize = size === "l" ? 28 : 15;

  return (
    <button data-design-id="m-c32597f75e04"
      type={type}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md text-[#0A0A0A] transition-colors hover:bg-[#F5F5F5] disabled:opacity-50",
        size === "l" && "rounded-full border border-[#E6E6E6] bg-white hover:bg-[#FAFAFA]",
        className,
      )}
      style={{ width: box, height: box }}
      {...props}
    >
      <Icon size={iconSize} className="text-current" />
    </button>
  );
}
