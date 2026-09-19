import { cn } from "@/lib/utils";

type FileThumbnailProps = {
  file: { name: string; type: string };
  previewImageUrl?: string | null;
  className?: string;
};

function extensionLabel(name: string, type: string) {
  const fromName = name.includes(".") ? name.split(".").pop() : "";
  if (fromName && fromName.length <= 5) return fromName.toUpperCase();
  if (type.includes("pdf")) return "PDF";
  if (type.includes("sheet") || type.includes("csv")) return "XLS";
  if (type.includes("word")) return "DOC";
  if (type.startsWith("image/")) return "IMG";
  return "FILE";
}

export function FileThumbnail({
  file,
  previewImageUrl,
  className,
}: FileThumbnailProps) {
  if (previewImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img data-design-id="m-3f670b84f967"
        src={previewImageUrl}
        alt=""
        className={cn("object-cover", className)}
      />
    );
  }

  return (
    <div data-design-id="m-5bbe52deee38"
      className={cn(
        "grid place-items-center border border-[#E6E6E6] bg-[#FAFAFA] text-[10px] font-medium tracking-wide text-[#5E5E5E]",
        className,
      )}
    >
      {extensionLabel(file.name, file.type)}
    </div>
  );
}
