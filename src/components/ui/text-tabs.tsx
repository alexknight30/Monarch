import { cn } from "@/lib/utils";

export function TextTabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: readonly { id: T; label: string }[] | readonly T[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div data-design-id="m-556090db82f3" className="flex items-center gap-1.5">
      {items.map((item) => {
        const id = (typeof item === "string" ? item : item.id) as T;
        const label = typeof item === "string" ? item : item.label;
        const active = id === value;
        return (
          <button data-design-id="m-8bdafac99a5d" data-design-key={id}
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "flex h-[34px] items-center rounded-lg px-3.5 text-sm leading-[18px] transition-colors",
              active
                ? "bg-[#F1F1EF] text-[#0A0A0A]"
                : "text-[#5E5E5E] hover:bg-[#F7F7F5]",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
