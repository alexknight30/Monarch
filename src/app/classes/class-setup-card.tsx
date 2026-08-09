"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/ui/file-upload";
import { useViewId } from "@/components/view-provider";

type Mode = "syllabus" | "manual";

type ClassSetupCardProps = {
  onCancel: () => void;
};

export function ClassSetupCard({ onCancel }: ClassSetupCardProps) {
  const router = useRouter();
  const viewId = useViewId();
  const [mode, setMode] = useState<Mode>("syllabus");
  const [busy, setBusy] = useState(false);

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [instructor, setInstructor] = useState("");
  const [schedule, setSchedule] = useState("");
  const [description, setDescription] = useState("");

  const saveManual = async () => {
    if (!code.trim() || !title.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/${viewId}/classes`, {
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
      if (!res.ok) throw new Error(data.error ?? "Could not create class.");
      router.refresh();
      onCancel();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not create class.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative mt-8 rounded-xl border border-[#E8E8E6] bg-white p-6 shadow-[0_8px_28px_rgba(0,0,0,0.04)]">
      <div className="absolute top-5 right-5 flex h-8 items-center rounded-full border border-[#E6E6E6] bg-[#FAFAFA] p-0.5">
        {(["syllabus", "manual"] as const).map((option) => {
          const active = mode === option;
          return (
            <button
              key={option}
              type="button"
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
        <div className="flex flex-col gap-4 pr-36">
          <div>
            <h2 className="text-base font-semibold leading-5 tracking-[-0.005em] text-[#0A0A0A]">
              Add a class
            </h2>
            <p className="pt-1.5 text-sm leading-5 text-[#6B6B6B]">
              Add a syllabus
            </p>
          </div>
          <FileUpload
            multiple={false}
            title="Drop your syllabus here"
            description="PDF, DOC/DOCX, or image"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4 pr-36">
          <div>
            <h2 className="text-base font-semibold leading-5 tracking-[-0.005em] text-[#0A0A0A]">
              Add a class
            </h2>
            <p className="pt-1.5 text-sm leading-5 text-[#6B6B6B]">
              Enter course details manually
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] leading-4 font-medium text-[#5E5E5E]">
                Course code
              </span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CHEM 122"
                className="h-10 rounded-lg border border-[#E6E6E6] px-3 text-sm text-[#0A0A0A] outline-none placeholder:text-[#B4B4B0] focus:border-[#0A0A0A]"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] leading-4 font-medium text-[#5E5E5E]">
                Course title
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Organic Chemistry II"
                className="h-10 rounded-lg border border-[#E6E6E6] px-3 text-sm text-[#0A0A0A] outline-none placeholder:text-[#B4B4B0] focus:border-[#0A0A0A]"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] leading-4 font-medium text-[#5E5E5E]">
                Instructor
              </span>
              <input
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                placeholder="Prof. Nadia Farouk"
                className="h-10 rounded-lg border border-[#E6E6E6] px-3 text-sm text-[#0A0A0A] outline-none placeholder:text-[#B4B4B0] focus:border-[#0A0A0A]"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] leading-4 font-medium text-[#5E5E5E]">
                Schedule
              </span>
              <input
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="MWF · 10:00–10:50 AM"
                className="h-10 rounded-lg border border-[#E6E6E6] px-3 text-sm text-[#0A0A0A] outline-none placeholder:text-[#B4B4B0] focus:border-[#0A0A0A]"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] leading-4 font-medium text-[#5E5E5E]">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this course covers…"
              rows={3}
              className="resize-none rounded-lg border border-[#E6E6E6] px-3 py-2.5 text-sm text-[#0A0A0A] outline-none placeholder:text-[#B4B4B0] focus:border-[#0A0A0A]"
            />
          </label>
        </div>
      )}

      <div className="mt-5 flex items-center justify-end gap-2 border-t border-[#F0F0F0] pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-9 items-center rounded-lg px-3.5 text-sm text-[#5E5E5E] transition-colors hover:bg-[#FAFAFA]"
        >
          Cancel
        </button>
        {mode === "manual" ? (
          <button
            type="button"
            onClick={() => void saveManual()}
            disabled={busy || !code.trim() || !title.trim()}
            className="flex h-9 items-center rounded-lg bg-[#141414] px-4 text-sm font-medium text-white transition-colors hover:bg-[#000000] disabled:opacity-40"
          >
            {busy ? "Saving…" : "Add class"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="flex h-9 items-center rounded-lg bg-[#141414] px-4 text-sm font-medium text-white transition-colors hover:bg-[#000000]"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
