"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy01Icon } from "@/components/ui/copy-01";
import { IconButton } from "@/components/ui/icon-button";
import { TextTabs } from "@/components/ui/text-tabs";
import {
  addCustomSkill,
  listSkills,
  removeCustomSkill,
  type Skill,
} from "@/lib/skills";

const TABS = ["Student info", "Usage", "API key", "Skills"] as const;
type Tab = (typeof TABS)[number];

type Student = {
  fullName: string;
  preferredName: string;
  email: string;
  studentId: string;
  major: string;
  year: string;
  school: string;
};

type Usage = {
  plan: string;
  periodLabel: string;
  messagesUsed: number;
  messagesLimit: number;
  tokensUsed: string;
  tokensLimit: string;
  storageUsed: string;
  storageLimit: string;
};

const MOCK_API_KEY = "lms_live_8f3a2c91e0b74d6a9c1e5f28d0a4b7c3";

function Field({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] leading-4 font-medium text-[#5E5E5E]">{label}</span>
      <input
        type="text"
        defaultValue={value}
        className="h-10 rounded-lg border border-[#E6E6E6] bg-white px-3 text-sm leading-[18px] text-[#0A0A0A] outline-none transition-colors placeholder:text-[#B0B0AC] focus:border-[#0A0A0A]"
      />
      {hint ? (
        <span className="text-[12.5px] leading-4 text-[#9A9A98]">{hint}</span>
      ) : null}
    </label>
  );
}

function UsageMeter({
  label,
  used,
  limit,
  pct,
}: {
  label: string;
  used: string;
  limit: string;
  pct: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm leading-[18px] text-[#0A0A0A]">{label}</span>
        <span className="text-[13px] leading-4 text-[#9A9A98] tabular-nums">
          {used} <span className="text-[#C4C4C0]">/</span> {limit}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#EFEFED]">
        <div
          className="h-full rounded-full bg-[#0A0A0A]"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}

export default function SettingsClient({
  student,
  usage,
}: {
  student: Student;
  usage: Usage;
}) {
  const [tab, setTab] = useState<Tab>("Student info");
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState(MOCK_API_KEY);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [addingSkill, setAddingSkill] = useState(false);
  const [skillForm, setSkillForm] = useState({
    command: "",
    name: "",
    description: "",
    prompt: "",
  });
  const [skillError, setSkillError] = useState<string | null>(null);

  const masked = `${apiKey.slice(0, 12)}${"•".repeat(20)}${apiKey.slice(-4)}`;
  const messagesPct = (usage.messagesUsed / usage.messagesLimit) * 100;

  useEffect(() => {
    if (tab === "Skills") setSkills(listSkills());
  }, [tab]);

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  };

  const regenerate = () => {
    const next = `lms_live_${Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join("")}`;
    setApiKey(next);
    setRevealed(true);
    setCopied(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto pt-13 pb-16">
      <div className="w-240">
        <h1 className="font-display text-[34px] leading-[42px] tracking-[-0.015em] text-[#0A0A0A]">
          Settings
        </h1>
        <p className="pt-2.5 text-[15px] leading-[22px] text-[#9A9A98]">
          Manage your profile, plan usage, skills, and developer access.
        </p>

        <div className="pt-[30px]">
          <TextTabs items={TABS} value={tab} onChange={setTab} />
        </div>

        {tab === "Student info" ? (
          <section className="mt-8 flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full name" value={student.fullName} />
              <Field label="Preferred name" value={student.preferredName} />
              <Field
                label="School email"
                value={student.email}
                hint="Used for sign-in and course notifications."
              />
              <Field
                label="Student ID"
                value={student.studentId}
                hint="Assigned by your registrar."
              />
              <Field label="Major" value={student.major} />
              <Field label="Course year" value={student.year} />
            </div>
            <Field label="School" value={student.school} />
            <div className="flex justify-end pt-2">
              <Button>Save changes</Button>
            </div>
          </section>
        ) : null}

        {tab === "Usage" ? (
          <section className="mt-8 flex flex-col gap-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[13px] leading-4 text-[#9A9A98]">Current plan</p>
                <p className="pt-1 text-base font-semibold leading-5 tracking-[-0.005em] text-[#0A0A0A]">
                  {usage.plan}
                </p>
              </div>
              <p className="text-[13px] leading-4 text-[#9A9A98]">{usage.periodLabel}</p>
            </div>

            <div className="flex flex-col gap-5">
              <UsageMeter
                label="Messages"
                used={String(usage.messagesUsed)}
                limit={String(usage.messagesLimit)}
                pct={messagesPct}
              />
              <UsageMeter
                label="Tokens"
                used={usage.tokensUsed}
                limit={usage.tokensLimit}
                pct={viewTokensPct(usage.tokensUsed, usage.tokensLimit)}
              />
              <UsageMeter
                label="File storage"
                used={usage.storageUsed}
                limit={usage.storageLimit}
                pct={viewStoragePct(usage.storageUsed, usage.storageLimit)}
              />
            </div>

            <p className="text-[13px] leading-[18px] text-[#9A9A98]">
              Usage resets at the start of each billing period. Contact your school
              admin if you need a higher limit.
            </p>
          </section>
        ) : null}

        {tab === "API key" ? (
          <section className="mt-8 flex flex-col gap-5">
            <div>
              <h2 className="text-base font-semibold leading-5 tracking-[-0.005em] text-[#0A0A0A]">
                Personal API key
              </h2>
              <p className="pt-1.5 text-[13px] leading-[18px] text-[#9A9A98]">
                Use this key to call Monarch from your own scripts and course tools.
                Keep it private — anyone with it can act as you.
              </p>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] leading-4 font-medium text-[#5E5E5E]">
                Key
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={revealed ? apiKey : masked}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-[#E6E6E6] bg-[#FAFAFA] px-3 font-mono text-[13px] leading-[18px] text-[#0A0A0A] outline-none"
                />
                <Button variant="secondary" onClick={() => setRevealed((v) => !v)}>
                  {revealed ? "Hide" : "Reveal"}
                </Button>
                <IconButton
                  icon={Copy01Icon}
                  label={copied ? "Copied" : "Copy"}
                  onClick={copyKey}
                />
              </div>
            </label>

            <div className="flex items-center justify-between gap-4 pt-1">
              <p className="text-[13px] leading-[18px] text-[#9A9A98]">
                Regenerating immediately invalidates the previous key.
              </p>
              <Button onClick={regenerate}>Regenerate</Button>
            </div>
          </section>
        ) : null}

        {tab === "Skills" ? (
          <section className="mt-8 flex flex-col gap-6">
            <div>
              <h2 className="text-base font-semibold leading-5 tracking-[-0.005em] text-[#0A0A0A]">
                Chat skills
              </h2>
              <p className="pt-1.5 text-[13px] leading-[18px] text-[#9A9A98]">
                Type{" "}
                <span className="font-mono text-[#5E5E5E]">/</span> in chat to
                run a skill on the last reply.
              </p>
            </div>

            <ul className="flex flex-col">
              {skills.map((skill, index) => (
                <li
                  key={skill.id}
                  className={`flex items-start justify-between gap-4 py-4 ${
                    index > 0 ? "border-t border-[#EFEFED]" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm leading-[18px] text-[#0A0A0A]">
                        /{skill.command}
                      </span>
                      {skill.builtin ? (
                        <span className="rounded-md bg-[#F1F1EF] px-1.5 py-0.5 text-[11px] leading-3 text-[#5E5E5E]">
                          Built-in
                        </span>
                      ) : null}
                    </div>
                    <p className="pt-1 text-[13px] leading-[18px] text-[#9A9A98]">
                      {skill.description}
                    </p>
                  </div>
                  {!skill.builtin ? (
                    <button
                      type="button"
                      onClick={() => {
                        removeCustomSkill(skill.id);
                        setSkills(listSkills());
                      }}
                      className="shrink-0 text-[13px] leading-4 text-[#9A9A98] hover:text-[#0A0A0A]"
                    >
                      Remove
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>

            {addingSkill ? (
              <div className="flex flex-col gap-4 border-t border-[#EFEFED] pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] leading-4 font-medium text-[#5E5E5E]">
                      Command
                    </span>
                    <div className="flex h-10 items-center rounded-lg border border-[#E6E6E6] bg-white px-3">
                      <span className="font-mono text-sm text-[#9A9A98]">/</span>
                      <input
                        type="text"
                        value={skillForm.command}
                        onChange={(e) =>
                          setSkillForm((f) => ({
                            ...f,
                            command: e.target.value
                              .replace(/^\//, "")
                              .toLowerCase(),
                          }))
                        }
                        placeholder="review"
                        className="h-full min-w-0 flex-1 border-0 bg-transparent font-mono text-sm text-[#0A0A0A] outline-none placeholder:text-[#B0B0AC]"
                      />
                    </div>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] leading-4 font-medium text-[#5E5E5E]">
                      Name
                    </span>
                    <input
                      type="text"
                      value={skillForm.name}
                      onChange={(e) =>
                        setSkillForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="Quick review"
                      className="h-10 rounded-lg border border-[#E6E6E6] bg-white px-3 text-sm leading-[18px] text-[#0A0A0A] outline-none focus:border-[#0A0A0A]"
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] leading-4 font-medium text-[#5E5E5E]">
                    Short description
                  </span>
                  <input
                    type="text"
                    value={skillForm.description}
                    onChange={(e) =>
                      setSkillForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    placeholder="What this skill does in one line"
                    className="h-10 rounded-lg border border-[#E6E6E6] bg-white px-3 text-sm leading-[18px] text-[#0A0A0A] outline-none focus:border-[#0A0A0A]"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] leading-4 font-medium text-[#5E5E5E]">
                    Instruction
                  </span>
                  <textarea
                    value={skillForm.prompt}
                    onChange={(e) =>
                      setSkillForm((f) => ({ ...f, prompt: e.target.value }))
                    }
                    rows={4}
                    placeholder="Tell the model what to do with the last reply…"
                    className="resize-none rounded-lg border border-[#E6E6E6] bg-white px-3 py-2.5 text-sm leading-[18px] text-[#0A0A0A] outline-none focus:border-[#0A0A0A]"
                  />
                </label>
                {skillError ? (
                  <p className="text-[13px] leading-4 text-red-600">
                    {skillError}
                  </p>
                ) : null}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setAddingSkill(false);
                      setSkillError(null);
                      setSkillForm({
                        command: "",
                        name: "",
                        description: "",
                        prompt: "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      try {
                        addCustomSkill(skillForm);
                        setSkills(listSkills());
                        setAddingSkill(false);
                        setSkillError(null);
                        setSkillForm({
                          command: "",
                          name: "",
                          description: "",
                          prompt: "",
                        });
                      } catch (err) {
                        setSkillError(
                          err instanceof Error
                            ? err.message
                            : "Could not add skill.",
                        );
                      }
                    }}
                  >
                    Save skill
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end border-t border-[#EFEFED] pt-5">
                <Button onClick={() => setAddingSkill(true)}>
                  Add custom skill
                </Button>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function viewTokensPct(used: string, limit: string) {
  const u = parseFloat(used);
  const l = parseFloat(limit);
  if (!Number.isFinite(u) || !Number.isFinite(l) || l === 0) return 0;
  return (u / l) * 100;
}

function viewStoragePct(used: string, limit: string) {
  const toMb = (raw: string) => {
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return 0;
    if (raw.toLowerCase().includes("gb")) return n * 1024;
    return n;
  };
  const u = toMb(used);
  const l = toMb(limit);
  if (l === 0) return 0;
  return (u / l) * 100;
}
