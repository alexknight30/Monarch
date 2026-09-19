"use client";
import { DesignCopy } from "@/components/design/runtime";


import * as React from "react";
import {
  FileImageIcon,
  FileSpreadsheetIcon,
  FileUploadIcon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { BorderBeam } from "border-beam";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { FileThumbnail } from "@/components/ui/file-thumbnail";

type FileUploadItem = {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
};

type AcceptedFileType = {
  label: string;
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
};

type FileUploadProps = {
  accept?: string;
  acceptedFileTypes?: AcceptedFileType[];
  borderBeamTheme?: React.ComponentProps<typeof BorderBeam>["theme"];
  browseLabel?: string;
  className?: string;
  description?: string;
  draggingLabel?: string;
  multiple?: boolean;
  showBorderBeam?: boolean;
  showFileList?: boolean;
  /** When false, hide the type/extension badge in the attached-file rows. */
  showFileTypeBadge?: boolean;
  title?: string;
  /** Overrides `title` once at least one file is attached. */
  titleWhenHasFiles?: string;
  /** Replaces the dropzone (file list underneath is unchanged). */
  dropzoneOverride?: React.ReactNode;
  onFilesAccepted?: (files: File[]) => void;
  onFilesChange?: (files: FileUploadItem[]) => void;
};

const ACCEPTED_FILE_TYPES: AcceptedFileType[] = [
  { label: "Image", icon: FileImageIcon },
  { label: "PDF", icon: FileUploadIcon },
  { label: "Sheet", icon: FileSpreadsheetIcon },
];
const DEFAULT_ACCEPT = [
  ".pdf",
  ".doc",
  ".docx",
  ".xlsx",
  ".csv",
  ".png",
  ".jpg",
  ".jpeg",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "image/png",
  "image/jpeg",
].join(",");
const ICON_TRANSFORMS = [
  {
    idle: "translate(-78%, -50%) rotate(-8deg)",
    active: "translate(-114%, -50%) rotate(-12deg) scale(1.08)",
  },
  {
    idle: "translate(-50%, -50%) rotate(0deg)",
    active: "translate(-50%, -50%) rotate(0deg) scale(1.18)",
  },
  {
    idle: "translate(-22%, -50%) rotate(8deg)",
    active: "translate(14%, -50%) rotate(12deg) scale(1.08)",
  },
];

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${
    units[index]
  }`;
}

function matchesAccept(file: File, accept?: string) {
  if (!accept) return true;

  return accept.split(",").some((rawToken) => {
    const token = rawToken.trim().toLowerCase();

    if (!token) return false;
    if (token.startsWith(".")) return file.name.toLowerCase().endsWith(token);
    if (token.endsWith("/*")) {
      return file.type.toLowerCase().startsWith(token.slice(0, -1));
    }

    return file.type.toLowerCase() === token;
  });
}

function toUploadItems(files: FileList | File[]): FileUploadItem[] {
  return Array.from(files).map((file) => ({
    id: `${file.name}-${file.size}-${file.lastModified}`,
    name: file.name,
    type: file.type || "Unknown type",
    size: file.size,
    url: URL.createObjectURL(file),
  }));
}

function UploadIconCluster({
  acceptedFileTypes,
  isDragging,
}: {
  acceptedFileTypes: AcceptedFileType[];
  isDragging: boolean;
}) {
  const singleIcon = acceptedFileTypes.length === 1;

  return (
    <div data-design-id="m-a3fce738331c" className="relative h-14 w-36">
      {acceptedFileTypes.map((item, index) => (
        <Card data-design-id="m-6549a0118a0a" data-design-key="m-6549a0118a0a"
          key={item.label}
          className={cn(
            "absolute top-1/2 left-1/2 grid size-12 place-items-center rounded-xl bg-background text-muted-foreground transition-[transform,color,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] before:rounded-[calc(var(--radius-xl)-1px)]",
            "motion-reduce:transition-none",
            index === 1 && "z-10",
            isDragging &&
              "bg-popover text-foreground shadow-md shadow-black/10 not-dark:bg-clip-border dark:shadow-black/25",
          )}
          style={{
            transform: singleIcon
              ? `translate(-50%, -50%) scale(${isDragging ? 1.14 : 1})`
              : isDragging
                ? ICON_TRANSFORMS[index]?.active
                : ICON_TRANSFORMS[index]?.idle,
          }}
        >
          <HugeiconsIcon icon={item.icon} className="size-5" />
        </Card>
      ))}
    </div>
  );
}

export function FileUpload({
  accept = DEFAULT_ACCEPT,
  acceptedFileTypes = ACCEPTED_FILE_TYPES,
  borderBeamTheme = "light",
  browseLabel = "Browse files",
  className,
  description = "PDF, DOC/DOCX, XLSX, CSV, PNG, or JPG",
  draggingLabel = "Drop to add",
  multiple = true,
  showBorderBeam = true,
  showFileList = true,
  showFileTypeBadge = true,
  title = "Click to upload or drop files",
  titleWhenHasFiles,
  dropzoneOverride,
  onFilesAccepted,
  onFilesChange,
}: FileUploadProps) {
  const dragDepthRef = React.useRef(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [files, setFiles] = React.useState<FileUploadItem[]>([]);
  const [rejectionMessage, setRejectionMessage] = React.useState<string | null>(
    null,
  );

  const commitFiles = React.useCallback(
    (nextFiles: FileList | File[]) => {
      const acceptedFiles = Array.from(nextFiles)
        .filter((file) => matchesAccept(file, accept))
        .slice(0, multiple ? undefined : 1);

      if (acceptedFiles.length === 0) {
        setRejectionMessage("This file type is not supported here.");
        return;
      }

      setRejectionMessage(null);
      onFilesAccepted?.(acceptedFiles);

      const items = toUploadItems(acceptedFiles);
      setFiles((previousFiles) => {
        previousFiles.forEach((file) => URL.revokeObjectURL(file.url));
        return items;
      });
      onFilesChange?.(items);
    },
    [accept, multiple, onFilesAccepted, onFilesChange],
  );

  React.useEffect(() => {
    return () => {
      files.forEach((file) => URL.revokeObjectURL(file.url));
    };
  }, [files]);

  const openFileDialog = React.useCallback(() => {
    inputRef.current?.click();
  }, []);

  const dropzone = (
    <div data-design-id="m-f009ecd31287"
      role="button"
      tabIndex={0}
      className={cn(
        "relative flex min-h-64 cursor-pointer flex-col items-center justify-center gap-5 overflow-hidden rounded-[1.125rem] border border-dashed bg-background px-6 py-10 text-center transition-[border-color,background-color] duration-200 ease-out",
        "motion-reduce:transition-none",
        isDragging
          ? "border-foreground/40 bg-accent/35"
          : "border-foreground/20 hover:border-foreground/35 hover:bg-muted/35 dark:border-foreground/25 dark:hover:border-foreground/40",
      )}
      onClick={openFileDialog}
      onDragEnter={(event) => {
        event.preventDefault();
        dragDepthRef.current += 1;
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) setIsDragging(false);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        dragDepthRef.current = 0;
        setIsDragging(false);
        if (event.dataTransfer.files.length > 0) {
          commitFiles(event.dataTransfer.files);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openFileDialog();
        }
      }}
    >
      <UploadIconCluster
        acceptedFileTypes={acceptedFileTypes}
        isDragging={isDragging}
      />
      <div data-design-id="m-629f394c0ce3" className="space-y-1">
        <div data-design-id="m-655f9139a7d4" className="text-sm font-medium">
          {files.length > 0 && titleWhenHasFiles ? titleWhenHasFiles : title}
        </div>
        <div data-design-id="m-b3dc8bc78e48" className="text-xs text-muted-foreground">{description}</div>
        {rejectionMessage ? (
          <div data-design-id="m-c429cc3cad7b" className="text-xs text-destructive">{rejectionMessage}</div>
        ) : null}
      </div>
      <div data-design-id="m-59c06db36a9d" className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
        <HugeiconsIcon icon={Upload01Icon} className="size-3.5" />
        <span data-design-id="m-feb0e8bf46db">{isDragging ? draggingLabel : browseLabel}</span>
      </div>
      <input data-design-id="m-ff5b94ce8612"
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(event) => {
          if (event.target.files) {
            commitFiles(event.target.files);
            event.currentTarget.value = "";
          }
        }}
      />
    </div>
  );

  const surface = dropzoneOverride ?? dropzone;
  const beam = showBorderBeam && !dropzoneOverride;

  return (
    <div data-design-id="m-c9316b876a0d" className={cn("space-y-3", className)}>
      {beam ? (
        <BorderBeam
          active={isDragging}
          borderRadius={18}
          brightness={2.4}
          className="rounded-[1.125rem]"
          colorVariant="ocean"
          duration={2.4}
          size="md"
          strength={1}
          theme={borderBeamTheme}
        >
          {surface}
        </BorderBeam>
      ) : (
        surface
      )}
      {showFileList && files.length > 0 ? (
        <div data-design-id="m-7dc7c4edf769" className="rounded-xl border bg-background">
          {files.map((file) => (
            <div data-design-id="m-645de447c3f5" data-design-key={file.id}
              key={file.id}
              className="flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0"
            >
              {showFileTypeBadge ? (
                <FileThumbnail
                  file={{
                    name: file.name,
                    type: file.type,
                  }}
                  previewImageUrl={
                    file.type.startsWith("image/") ? file.url : null
                  }
                  className="size-10 shrink-0 rounded-lg"
                />
              ) : null}
              <div data-design-id="m-db69c46e4703" className="min-w-0 flex-1">
                <div data-design-id="m-2f49fae7fc44" className="truncate text-sm font-medium">{file.name}</div>
                <div data-design-id="m-6e2dc6ccf509" className="truncate text-xs text-muted-foreground">
                  {file.type} - {formatBytes(file.size)}
                </div>
              </div>
              <div data-design-id="m-95cc15d9a31c" className="text-xs text-muted-foreground"><DesignCopy id="m-95cc15d9a31c">Ready</DesignCopy></div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default FileUpload;
