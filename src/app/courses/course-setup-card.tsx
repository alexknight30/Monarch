"use client";
import { DesignCopy } from "@/components/design/runtime";


import { useState } from "react";
import { useRouter } from "next/navigation";
import { ButterflyMeadow } from "@/components/butterfly-meadow";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { useViewId } from "@/components/view-provider";
import { deriveSchedule } from "@/lib/mock-data";
import type { Proposal } from "@/lib/source-documents";
import { filterProposal, SyllabusProposal } from "./syllabus-proposal";

type Mode = "syllabus" | "manual";
type SyllabusPhase = "idle" | "playing" | "review" | "error";

function MeadowStatus({ text }: { text: string }) {
  return (
    <p data-design-id="m-fd2ac03918be" role="status" className="pointer-events-none absolute top-4 right-5 z-10 max-w-[220px] text-right font-display text-[22px] leading-7 tracking-[-0.015em] text-[#0A0A0A]">
      {text}
    </p>
  );
}

function isIngestible(file: File) {
  const name = file.name.toLowerCase();
  return (
    file.type === "application/pdf" ||
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    file.type === "image/jpg" ||
    name.endsWith(".pdf") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg")
  );
}

type CourseSetupCardProps = {
  onCancel: () => void;
};

export function CourseSetupCard({ onCancel }: CourseSetupCardProps) {
  const router = useRouter();
  const viewId = useViewId();
  const [mode, setMode] = useState<Mode>("syllabus");
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<SyllabusPhase>("idle");
  const [statusText, setStatusText] = useState("Uploading syllabus…");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [instructor, setInstructor] = useState("");
  const [schedule, setSchedule] = useState("");
  const [description, setDescription] = useState("");

  const saveManual = async () => {
    if (!code.trim() || !title.trim() || busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/${viewId}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          title: title.trim(),
          instructor: instructor.trim() || undefined,
          schedule: schedule.trim() || undefined,
          description: description.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not create course.");
      router.refresh();
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create course.");
    } finally {
      setBusy(false);
    }
  };

  const runIngest = async (accepted: File[]) => {
    const file = accepted.find(isIngestible);
    if (!file) {
      setError("Only PDF and image syllabi can be ingested. Convert DOC/DOCX first.");
      setPhase("error");
      return;
    }

    setError(null);
    setProposal(null);
    setStatusText("Uploading syllabus…");

    try {
      const form = new FormData();
      form.append("file", file);
      const uploaded = await fetch(`/api/${viewId}/documents`, {
        method: "POST",
        body: form,
      });
      const uploadBody = (await uploaded.json().catch(() => ({}))) as {
        error?: string;
        document?: { id: string };
      };
      if (!uploaded.ok || !uploadBody.document) {
        throw new Error(uploadBody.error ?? "Could not upload the syllabus.");
      }

      setStatusText("Reading course details and deadlines…");
      const ingested = await fetch(`/api/${viewId}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: uploadBody.document.id }),
      });
      const ingestBody = (await ingested.json().catch(() => ({}))) as {
        error?: string;
        proposal?: Proposal;
      };
      if (!ingested.ok || !ingestBody.proposal) {
        throw new Error(ingestBody.error ?? "Could not read the syllabus.");
      }

      const next = ingestBody.proposal;
      if (!next.course.schedule && next.course.meetings?.length) {
        next.course.schedule = deriveSchedule(next.course.meetings);
      }
      setProposal(next);
      setExcluded(new Set());
      setPhase("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the syllabus.");
      setPhase("error");
    }
  };

  const startMeadow = () => {
    if (phase !== "idle" && phase !== "error") return;
    if (files.length === 0) return;
    setPhase("playing");
    void runIngest(files);
  };

  const applyProposal = async () => {
    if (!proposal || busy) return;
    setError(null);
    setBusy(true);
    try {
      const body = filterProposal(proposal, excluded);
      const res = await fetch(`/api/${viewId}/ingest/${proposal.runId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not add the course.");
      router.refresh();
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the course.");
    } finally {
      setBusy(false);
    }
  };

  const dropzoneOverride =
    phase === "idle" ? undefined : phase === "review" && proposal ? (
      <SyllabusProposal
        proposal={proposal}
        excluded={excluded}
        onChange={setProposal}
        onToggleAssignment={(id) => {
          setExcluded((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          });
        }}
      />
    ) : phase === "error" ? (
      <div data-design-id="m-0b479762112b" className="flex h-64 items-center justify-center rounded-[1.125rem] border border-dashed border-foreground/20 bg-background px-6 text-center">
        <p data-design-id="m-c7c31be01602" className="max-w-sm text-sm leading-5 text-[#6B6B6B]">{error}</p>
      </div>
    ) : (
      <div data-design-id="m-dae30b19d2b1" className="relative h-64 overflow-hidden rounded-[1.125rem] border border-dashed border-foreground/20 bg-background">
        <ButterflyMeadow className="absolute inset-0" />
        <MeadowStatus text={statusText} />
      </div>
    );

  return (
    <div data-design-id="m-1647ed7734c3" className="relative mt-8 rounded-xl border border-[#E8E8E6] bg-white p-6 shadow-[0_8px_28px_rgba(0,0,0,0.04)]">
      <div data-design-id="m-bbc63992b369" className="absolute top-5 right-5 flex h-8 items-center rounded-full border border-[#E6E6E6] bg-[#FAFAFA] p-0.5">
        {(["syllabus", "manual"] as const).map((option) => {
          const active = mode === option;
          return (
            <button data-design-id="m-9a61f1b9122a" data-design-key={option}
              key={option}
              type="button"
              disabled={phase === "playing" || busy}
              onClick={() => setMode(option)}
              className={`h-7 rounded-full px-3 text-[12px] leading-4 font-medium capitalize transition-colors ${
                active
                  ? "bg-white text-[#0A0A0A] shadow-sm"
                  : "text-[#7A7A7A] hover:text-[#3D3D3D]"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {mode === "syllabus" ? (
        <div data-design-id="m-f55b2df34fa4" className="flex flex-col gap-4 pr-36">
          <div data-design-id="m-e301cf1722d3">
            <h2 data-design-id="m-fb3430e11b40" className="text-base font-semibold leading-5 tracking-[-0.005em] text-[#0A0A0A]"><DesignCopy id="m-fb3430e11b40">
              Add a course
            </DesignCopy></h2>
            <p data-design-id="m-cf888ad973ee" className="pt-1.5 text-sm leading-5 text-[#6B6B6B]"><DesignCopy id="m-cf888ad973ee">
              Add a syllabus
            </DesignCopy></p>
          </div>
          <FileUpload
            multiple={false}
            showFileTypeBadge={false}
            title="Drop your syllabus here"
            titleWhenHasFiles="Replace syllabus"
            description="One course at a time · PDF or image"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            onFilesAccepted={setFiles}
            onFilesChange={(items) => {
              if (items.length === 0) setFiles([]);
            }}
            dropzoneOverride={dropzoneOverride}
          />
        </div>
      ) : (
        <div data-design-id="m-1c1c7d8089d1" className="flex flex-col gap-4 pr-36">
          <div data-design-id="m-3f1c66bfa2a0">
            <h2 data-design-id="m-ea406a72fd88" className="text-base font-semibold leading-5 tracking-[-0.005em] text-[#0A0A0A]"><DesignCopy id="m-ea406a72fd88">
              Add a course
            </DesignCopy></h2>
            <p data-design-id="m-f18522072e60" className="pt-1.5 text-sm leading-5 text-[#6B6B6B]"><DesignCopy id="m-f18522072e60">
              Enter course details manually
            </DesignCopy></p>
          </div>

          <div data-design-id="m-b6f4ef88a497" className="grid grid-cols-2 gap-3">
            <label data-design-id="m-b6fb4452274d" className="flex flex-col gap-1.5">
              <span data-design-id="m-aca40ac114e0" className="text-[12px] leading-4 font-medium text-[#5E5E5E]"><DesignCopy id="m-aca40ac114e0">
                Course code
              </DesignCopy></span>
              <input data-design-id="m-243f14f83407"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CHEM 122"
                className="h-10 rounded-lg border border-[#E6E6E6] px-3 text-sm text-[#0A0A0A] outline-none placeholder:text-[#B4B4B0] focus:border-[#0A0A0A]"
              />
            </label>
            <label data-design-id="m-cf4b63cab1b1" className="flex flex-col gap-1.5">
              <span data-design-id="m-329ca0d59663" className="text-[12px] leading-4 font-medium text-[#5E5E5E]"><DesignCopy id="m-329ca0d59663">
                Course title
              </DesignCopy></span>
              <input data-design-id="m-ffe1af807b2d"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Organic Chemistry II"
                className="h-10 rounded-lg border border-[#E6E6E6] px-3 text-sm text-[#0A0A0A] outline-none placeholder:text-[#B4B4B0] focus:border-[#0A0A0A]"
              />
            </label>
            <label data-design-id="m-78df20e2604e" className="flex flex-col gap-1.5">
              <span data-design-id="m-f26d66c3218a" className="text-[12px] leading-4 font-medium text-[#5E5E5E]"><DesignCopy id="m-f26d66c3218a">
                Instructor
              </DesignCopy></span>
              <input data-design-id="m-0aad7d92c4b4"
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                placeholder="Prof. Nadia Farouk"
                className="h-10 rounded-lg border border-[#E6E6E6] px-3 text-sm text-[#0A0A0A] outline-none placeholder:text-[#B4B4B0] focus:border-[#0A0A0A]"
              />
            </label>
            <label data-design-id="m-fe3e6c3ff475" className="flex flex-col gap-1.5">
              <span data-design-id="m-aac54b771733" className="text-[12px] leading-4 font-medium text-[#5E5E5E]"><DesignCopy id="m-aac54b771733">
                Schedule
              </DesignCopy></span>
              <input data-design-id="m-305a3023cf51"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="MWF · 10:00–10:50 AM"
                className="h-10 rounded-lg border border-[#E6E6E6] px-3 text-sm text-[#0A0A0A] outline-none placeholder:text-[#B4B4B0] focus:border-[#0A0A0A]"
              />
            </label>
          </div>

          <label data-design-id="m-29df3652fedf" className="flex flex-col gap-1.5">
            <span data-design-id="m-73be85d96061" className="text-[12px] leading-4 font-medium text-[#5E5E5E]"><DesignCopy id="m-73be85d96061">
              Description
            </DesignCopy></span>
            <textarea data-design-id="m-1c98e862e576"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this course covers…"
              rows={3}
              className="resize-none rounded-lg border border-[#E6E6E6] px-3 py-2.5 text-sm text-[#0A0A0A] outline-none placeholder:text-[#B4B4B0] focus:border-[#0A0A0A]"
            />
          </label>
        </div>
      )}

      {error&&phase!=="error"&&<p data-design-id="m-f784887eb196" role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      <div data-design-id="m-6a60d6cc30ac" className="mt-5 flex items-center justify-end gap-2 border-t border-[#EFEFED] pt-4">
        <Button data-design-id="m-aa61cf2380ab" data-design-key="m-aa61cf2380ab" variant="ghost" onClick={onCancel}><DesignCopy id="m-aa61cf2380ab">
          Cancel
        </DesignCopy></Button>
        {mode === "manual" ? (
          <Button data-design-id="m-0392971682b4" data-design-key="m-0392971682b4"
            onClick={() => void saveManual()}
            disabled={busy || !code.trim() || !title.trim()}
          >
            {busy ? "Saving…" : "Add course"}
          </Button>
        ) : phase === "review" ? (
          <Button data-design-id="m-4d0f7741ceba" data-design-key="m-4d0f7741ceba" onClick={() => void applyProposal()} disabled={busy || !proposal}>
            {busy ? "Adding…" : "Add course"}
          </Button>
        ) : phase === "error" ? (
          <><Button data-design-id="m-c5f057c1d592" data-design-key="m-c5f057c1d592" variant="ghost" onClick={()=>{setPhase("idle");setError(null);}}><DesignCopy id="m-c5f057c1d592">Choose another file</DesignCopy></Button><Button data-design-id="m-b24817b53d28" data-design-key="m-b24817b53d28" onClick={startMeadow} disabled={files.length === 0}><DesignCopy id="m-b24817b53d28">Retry</DesignCopy></Button></>
        ) : (
          <Button data-design-id="m-37d1a6010f5b" data-design-key="m-37d1a6010f5b"
            onClick={startMeadow}
            disabled={phase !== "idle" || files.length === 0}
          ><DesignCopy id="m-37d1a6010f5b">
            Go
          </DesignCopy></Button>
        )}
      </div>
    </div>
  );
}
