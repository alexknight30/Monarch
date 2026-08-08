import Link from "next/link";
import { PROJECTS } from "@/lib/mock-data";

const TABS = ["Your projects", "Organization", "Shared with you"];

export default function ProjectsPage() {
  return (
    <div className="flex flex-1 flex-col items-center pt-13 pb-16">
      <div className="w-240">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-display text-[34px] leading-[42px] tracking-[-0.015em] text-[#0A0A0A]">
            Projects
          </h1>
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Search" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E6E6E6] hover:bg-[#FAFAFA]">
              <svg width="17" height="17" viewBox="0 0 24 24" className="shrink-0">
                <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="#1A1A1A" strokeWidth="1.9" strokeLinecap="round" />
                <path d="M15.5 15.5L21 21" fill="none" stroke="#1A1A1A" strokeWidth="1.9" strokeLinecap="round" />
              </svg>
            </button>
            <button type="button" className="flex h-10 items-center gap-[7px] rounded-full border border-[#E6E6E6] px-3.5 hover:bg-[#FAFAFA]">
              <span className="text-sm leading-[18px] text-[#7A7A7A]">Sort by</span>
              <span className="text-sm leading-[18px] text-[#0A0A0A]">Last updated</span>
              <svg width="13" height="13" viewBox="0 0 24 24" className="shrink-0">
                <path d="M6 9.5l6 6 6-6" fill="none" stroke="#5E5E5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button type="button" className="flex h-10 items-center justify-center rounded-lg bg-[#141414] px-5 text-sm font-medium leading-[18px] text-white hover:bg-[#000000]">
              New project
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 pt-[30px]">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              type="button"
              className={`flex h-[34px] items-center rounded-lg px-3.5 text-sm leading-[18px] ${
                i === 0 ? "bg-[#F1F1EF] text-[#0A0A0A]" : "text-[#5E5E5E] hover:bg-[#F7F7F5]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-5 pt-6.5">
          {PROJECTS.map((project) => (
            <Link
              key={project.slug}
              href={`/projects/${project.slug}`}
              className="flex h-41 flex-col justify-between rounded-xl border border-[#E8E8E6] bg-white p-[22px] transition-colors hover:border-[#D6D6D2] hover:bg-[#FCFCFB]"
            >
              <div className="flex flex-col gap-[9px]">
                <h2 className="text-base font-semibold leading-5 tracking-[-0.005em] text-[#0A0A0A]">
                  {project.title}
                </h2>
                <p className="line-clamp-3 text-sm leading-[21px] text-[#4E4E4C]">
                  {project.description}
                </p>
              </div>
              <div className="flex w-full items-center justify-between">
                <span className="text-[13px] leading-4 text-[#9A9A98]">
                  Created by {project.createdBy}
                </span>
                <span className="text-[13px] leading-4 text-[#9A9A98]">{project.updated}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
