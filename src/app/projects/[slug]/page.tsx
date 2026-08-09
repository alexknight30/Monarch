import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerViewDataset } from "@/lib/views-server";

// No generateStaticParams: the page resolves against the active view's cookie,
// so which slugs exist is a per-request question, not a build-time one.

function LockIcon({ size = 12, color = "#9A9A98" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" fill="none" stroke={color} strokeWidth="2" />
      <path d="M8 10.5V7.5a4 4 0 018 0v3" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="shrink-0">
      <path d="M12 5v14M5 12h14" fill="none" stroke="#5E5E5E" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default async function ProjectDetailPage({ params }: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const { projects } = await getServerViewDataset();
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto pt-11 pb-16">
      <div className="flex w-[1180px] items-start gap-11">
        {/* ------------------------------------------------------ left ---- */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <Link href="/projects" className="text-sm leading-[18px] text-[#7A7A7A] hover:text-[#0A0A0A]">
              Projects
            </Link>
            <span className="text-sm leading-[18px] text-[#C4C4C0]">/</span>
            <span className="text-sm leading-[18px] text-[#0A0A0A]">{project.title}</span>
          </div>

          {/* Title block */}
          <div className="flex flex-col pt-[22px]">
            <div className="flex w-full items-center justify-between">
              <h1 className="font-display text-[34px] leading-[42px] tracking-[-0.015em] text-[#0A0A0A]">
                {project.title}
              </h1>
              <div className="flex shrink-0 items-center gap-2.5">
                <button type="button" aria-label="Pin project" className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-[#E6E6E6] hover:bg-[#FAFAFA]">
                  <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0">
                    <path d="M9.5 3.5h5l-.8 5.2 3.3 3.3-4.5 1-2.5 7.5-2.5-7.5-4.5-1 3.3-3.3z" fill="none" stroke="#1A1A1A" strokeWidth="1.7" strokeLinejoin="round" />
                  </svg>
                </button>
                <button type="button" className="flex h-[34px] items-center justify-center rounded-full border border-[#E6E6E6] px-4 text-sm font-medium leading-[18px] text-[#0A0A0A] hover:bg-[#FAFAFA]">
                  Share
                </button>
                <button type="button" aria-label="More options" className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full hover:bg-[#F5F5F3]">
                  <svg width="16" height="16" viewBox="0 0 24 24" className="shrink-0">
                    <circle cx="12" cy="5" r="1.7" fill="#5E5E5E" />
                    <circle cx="12" cy="12" r="1.7" fill="#5E5E5E" />
                    <circle cx="12" cy="19" r="1.7" fill="#5E5E5E" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <span className="text-[13px] leading-4 text-[#9A9A98]">Created by {project.createdBy}</span>
              <span className="text-[13px] leading-4 text-[#C4C4C0]">·</span>
              <LockIcon />
              <span className="text-[13px] leading-4 text-[#9A9A98]">{project.visibility}</span>
            </div>

            <p className="w-140 pt-3.5 text-sm leading-[21px] text-[#4E4E4C]">{project.description}</p>
          </div>

          {/* Composer */}
          <div className="flex w-full flex-col pt-[30px]">
            <div className="flex w-full flex-col rounded-[14px] border border-[#E0E0DD] bg-white p-5">
              <span className="text-base leading-[22px] text-[#9A9A98]">How can I help you today?</span>
              <div className="flex w-full items-center justify-between pt-[30px]">
                <div className="flex items-center gap-3">
                  <button type="button" aria-label="Attach" className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md hover:bg-[#F5F5F3]">
                    <PlusIcon />
                  </button>
                  <div className="flex items-center gap-0.5 rounded-full bg-[#F1F1EF] p-[3px]">
                    <button type="button" className="flex h-7 items-center justify-center rounded-full px-3.5 text-[13px] font-medium leading-4 text-[#5E5E5E]">
                      Chat
                    </button>
                    <button type="button" className="flex h-7 items-center justify-center rounded-full bg-white px-3.5 text-[13px] font-medium leading-4 text-[#0A0A0A]">
                      Cowork
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" className="flex items-center gap-[7px]">
                    <span className="text-[13px] font-medium leading-4 text-[#0A0A0A]">Opus 5</span>
                    <span className="text-[13px] leading-4 text-[#7A7A7A]">High</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" className="shrink-0">
                      <path d="M6 9.5l6 6 6-6" fill="none" stroke="#9A9A98" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button type="button" aria-label="Dictate" className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md hover:bg-[#F5F5F3]">
                    <svg width="16" height="16" viewBox="0 0 24 24" className="shrink-0">
                      <rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="#5E5E5E" strokeWidth="2" />
                      <path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3" fill="none" stroke="#5E5E5E" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex w-full items-center justify-between px-1 pt-3.5">
              <div className="flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0">
                  <rect x="3.5" y="4.5" width="17" height="4" rx="1.2" fill="none" stroke="#5E5E5E" strokeWidth="1.9" />
                  <path d="M5.5 8.5v9.8a1.7 1.7 0 001.7 1.7h9.6a1.7 1.7 0 001.7-1.7V8.5" fill="none" stroke="#5E5E5E" strokeWidth="1.9" />
                </svg>
                <span className="text-[13px] leading-4 text-[#4E4E4C]">{project.title}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" className="shrink-0">
                  <path d="M6 9.5l6 6 6-6" fill="none" stroke="#9A9A98" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0">
                <circle cx="12" cy="12" r="8.5" fill="none" stroke="#C4C4C0" strokeWidth="1.8" />
                <path d="M12 11v5.5" fill="none" stroke="#C4C4C0" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="12" cy="8" r="1" fill="#C4C4C0" />
              </svg>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex w-full items-center gap-1.5 pt-[30px]">
            <button type="button" className="flex h-[34px] items-center rounded-lg bg-[#F1F1EF] px-3.5 text-sm leading-[18px] text-[#0A0A0A]">
              Chats and tasks
            </button>
            <button type="button" className="flex h-[34px] items-center rounded-lg px-3.5 text-sm leading-[18px] text-[#5E5E5E] hover:bg-[#F7F7F5]">
              Activity
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-[7px]">
              <LockIcon />
              <span className="text-[13px] leading-4 text-[#9A9A98]">All chats are private unless shared</span>
            </div>
          </div>

          {/* Chats, or empty state */}
          {project.chats.length > 0 ? (
            <div className="flex w-full flex-col pt-5">
              {project.chats.map((chat) => (
                <button
                  key={chat.title}
                  type="button"
                  className="flex w-full items-center justify-between gap-6 border-b border-[#EFEFED] py-[18px] text-left last:border-b-0 hover:bg-[#FBFBFA]"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="truncate text-sm font-medium leading-5 text-[#0A0A0A]">{chat.title}</span>
                    <span className="truncate text-[13px] leading-[18px] text-[#7A7A7A]">{chat.snippet}</span>
                  </div>
                  <span className="shrink-0 text-[13px] leading-4 text-[#9A9A98]">{chat.when}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex w-full flex-col items-center justify-center gap-[18px] pt-24">
              <svg width="30" height="30" viewBox="0 0 24 24" className="shrink-0">
                <path
                  d="M4 11.2C4 7.2 7.6 4 12 4s8 3.2 8 7.2-3.6 7.2-8 7.2c-.9 0-1.8-.1-2.6-.4L5 19.6l1.1-3.1A6.9 6.9 0 014 11.2z"
                  fill="none"
                  stroke="#C4C4C0"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.6 11.4c.7 1 1.5 1.5 2.2 1.5.8 0 1-.7 1.8-.7.7 0 1.4.5 2.1 1.4"
                  fill="none"
                  stroke="#C4C4C0"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <p className="text-[15px] leading-[22px] text-[#9A9A98]">
                Start a chat and it&rsquo;ll pick up your project context automatically.
              </p>
            </div>
          )}
        </div>

        {/* ----------------------------------------------------- panel ---- */}
        <aside className="flex w-86 shrink-0 flex-col rounded-xl border border-[#E8E8E6] bg-white">
          <section className="flex w-full flex-col gap-1.5 border-b border-[#EFEFED] p-[22px]">
            <div className="flex w-full items-center justify-between">
              <h2 className="text-base font-semibold leading-5 tracking-[-0.005em] text-[#0A0A0A]">Instructions</h2>
              <button type="button" aria-label="Edit instructions">
                <PlusIcon />
              </button>
            </div>
            <p className="text-[13px] leading-[19px] text-[#4E4E4C]">
              {project.instructions ?? (
                <span className="text-[#9A9A98]">Tailor responses for this project.</span>
              )}
            </p>
          </section>

          <section className="flex w-full flex-col gap-4 border-b border-[#EFEFED] p-[22px]">
            <div className="flex w-full items-center justify-between">
              <h2 className="text-base font-semibold leading-5 tracking-[-0.005em] text-[#0A0A0A]">Context</h2>
              <button type="button" aria-label="Add context">
                <PlusIcon />
              </button>
            </div>

            {project.context.length > 0 ? (
              <ul className="flex w-full flex-col gap-2">
                {project.context.map((file) => (
                  <li key={file.name} className="flex items-center gap-2.5 rounded-lg border border-[#EFEFED] bg-[#FAFAF8] px-3 py-2.5">
                    <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0">
                      <path d="M5.5 3h9L19 7.5V21H5.5z" fill="none" stroke="#9A9A98" strokeWidth="1.7" strokeLinejoin="round" />
                      <path d="M14 3v5h5" fill="none" stroke="#9A9A98" strokeWidth="1.7" strokeLinejoin="round" />
                    </svg>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-[13px] leading-4 text-[#0A0A0A]">{file.name}</span>
                      <span className="truncate text-xs leading-4 text-[#9A9A98]">{file.meta}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex h-42 w-full flex-col items-center justify-center gap-3.5 rounded-[10px] border border-dashed border-[#DFDFDC] bg-[#FAFAF8] px-8.5">
                <svg width="46" height="34" viewBox="0 0 46 34" className="shrink-0">
                  <rect x="1.5" y="8" width="14" height="19" rx="2" fill="#FFFFFF" stroke="#DCDCD8" strokeWidth="1.4" />
                  <rect x="15.5" y="5" width="14" height="24" rx="2" fill="#FFFFFF" stroke="#DCDCD8" strokeWidth="1.4" />
                  <rect x="29.5" y="8" width="14" height="19" rx="2" fill="#FFFFFF" stroke="#DCDCD8" strokeWidth="1.4" />
                  <path d="M19 11h7M19 14h7M19 17h5" stroke="#DCDCD8" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <p className="text-center text-[13px] leading-[19px] text-[#9A9A98]">
                  Add PDFs, documents, or other text to reference in this project.
                </p>
              </div>
            )}
          </section>

          <section className="flex w-full flex-col gap-1.5 p-[22px]">
            <div className="flex w-full items-center justify-between">
              <h2 className="text-base font-semibold leading-5 tracking-[-0.005em] text-[#0A0A0A]">Scheduled</h2>
              <button type="button" aria-label="Add scheduled task">
                <PlusIcon />
              </button>
            </div>
            {project.scheduled.length > 0 ? (
              <ul className="flex w-full flex-col gap-2 pt-1.5">
                {project.scheduled.map((task) => (
                  <li key={task.name} className="flex flex-col gap-0.5">
                    <span className="text-[13px] leading-[18px] text-[#0A0A0A]">{task.name}</span>
                    <span className="text-xs leading-4 text-[#9A9A98]">{task.cadence}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] leading-[19px] text-[#9A9A98]">
                Set up recurring tasks for this project.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
