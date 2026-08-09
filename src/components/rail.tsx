"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { setActiveChatId } from "@/lib/chat-history";

// `/admin` (the view switcher) is deliberately absent: URL-only, and the rail
// hides itself there entirely. `/visibility` is the regular admin console.
const NAV = [
  {
    href: "/",
    label: "Home",
    // Chat lives under Home — keep the grid icon active in a session.
    match: (p: string) => p === "/" || p.startsWith("/chat"),
  },
  { href: "/calendar", label: "Calendar", match: (p: string) => p.startsWith("/calendar") },
  { href: "/planner", label: "Planner", match: (p: string) => p.startsWith("/planner") },
  { href: "/visibility", label: "Visibility", match: (p: string) => p.startsWith("/visibility") },
  { href: "/projects", label: "Projects", match: (p: string) => p.startsWith("/projects") },
  { href: "/classes", label: "Classes", match: (p: string) => p.startsWith("/classes") },
  { href: "/settings", label: "Settings", match: (p: string) => p.startsWith("/settings") },
];

/** The view switcher renders chrome-free. */
const HIDDEN_ON = ["/admin"];

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? "#0A0A0A" : "#8A8A8A";
  const common = {
    fill: "none",
    stroke,
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "Home") {
    return (
      <svg width="19" height="19" viewBox="0 0 24 24" className="shrink-0">
        <rect x="3" y="3" width="7.5" height="7.5" rx="2" {...common} />
        <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" {...common} />
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" {...common} />
        <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" {...common} />
      </svg>
    );
  }

  if (name === "Calendar") {
    return (
      <svg width="19" height="19" viewBox="0 0 24 24" className="shrink-0">
        <rect x="3" y="5" width="18" height="16" rx="3" {...common} />
        <path d="M3 10h18M8 3v4M16 3v4" {...common} />
      </svg>
    );
  }

  if (name === "Planner") {
    return (
      <svg width="19" height="19" viewBox="0 0 24 24" className="shrink-0">
        <path d="M4 5.5h16" {...common} />
        <path d="M8 11h12" {...common} />
        <path d="M12 16.5h8" {...common} />
        <path d="M4 5.5v5.5a2 2 0 0 0 2 2h2" {...common} />
        <path d="M8 11v3.5a2 2 0 0 0 2 2h2" {...common} />
      </svg>
    );
  }

  if (name === "Visibility") {
    return (
      <svg width="19" height="19" viewBox="0 0 24 24" className="shrink-0">
        <rect x="3" y="3" width="18" height="18" rx="4" {...common} />
        <path d="M7.5 15l3.2-3.6 2.6 2.2 3.4-4.4" {...common} />
      </svg>
    );
  }

  if (name === "Projects") {
    return (
      <svg width="19" height="19" viewBox="0 0 24 24" className="shrink-0">
        <rect x="3" y="4.5" width="18" height="4.5" rx="1.4" {...common} />
        <path d="M5.2 9v9.4a1.8 1.8 0 0 0 1.8 1.8h10a1.8 1.8 0 0 0 1.8-1.8V9" {...common} />
        <path d="M10 13h4" {...common} />
      </svg>
    );
  }

  if (name === "Classes") {
    return (
      <svg width="19" height="19" viewBox="0 0 24 24" className="shrink-0">
        <path d="M4 5.5h16v13H4z" {...common} />
        <path d="M8 5.5V18.5M4 9.5h16" {...common} />
      </svg>
    );
  }

  // Settings
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" className="shrink-0">
      <circle cx="12" cy="12" r="3" {...common} />
      <path
        d="M19.4 13a7.6 7.6 0 0 0 .1-2l2-1.5-2-3.5-2.4 1a7.4 7.4 0 0 0-1.7-1L15 3h-4l-.4 2.9a7.4 7.4 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7.4 7.4 0 0 0 1.7 1L11 21h4l.4-2.9a7.4 7.4 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5z"
        {...common}
      />
    </svg>
  );
}

export default function Rail() {
  const pathname = usePathname();
  if (HIDDEN_ON.includes(pathname)) return null;

  // Spacer keeps page layout fixed at the collapsed width; the real nav overlays
  // and grows to the right so icons never shift.
  return (
    <div className="relative h-full w-[66px] shrink-0">
      <nav className="group/rail absolute inset-y-0 left-0 z-40 flex h-full w-[66px] flex-col overflow-hidden border-r border-[#EAEAEA] bg-white transition-[width,box-shadow] duration-200 ease-out hover:w-[196px] hover:shadow-[4px_0_24px_rgba(0,0,0,0.06)]">
        <Link
          href="/?home=1"
          aria-label="Home"
          onClick={() => setActiveChatId(null)}
          className="flex h-[66px] w-[66px] shrink-0 items-center justify-center"
        >
          <svg width="27" height="27" viewBox="0 0 100 100" className="shrink-0">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M10.5 0H89.5C95.299 0 100 4.701 100 10.5V89.5C100 95.299 95.299 100 89.5 100H10.5C4.701 100 0 95.299 0 89.5V10.5C0 4.701 4.701 0 10.5 0ZM24 46V79.5C24 80.881 25.119 82 26.5 82H73.5C74.881 82 76 80.881 76 79.5V46C76 31.641 64.359 20 50 20C35.641 20 24 31.641 24 46Z"
              fill="#1F1E1C"
            />
          </svg>
        </Link>

        <div className="flex flex-col gap-3 px-[13px] pt-5">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 items-center gap-3 rounded-lg transition-colors ${
                  active ? "bg-[#F4F4F4]" : "hover:bg-[#F7F7F7]"
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                  <NavIcon name={item.label} active={active} />
                </span>
                <span
                  className={`truncate text-sm leading-4 whitespace-nowrap transition-opacity duration-200 ease-out ${
                    active ? "font-medium text-[#0A0A0A]" : "text-[#5E5E5E]"
                  } opacity-0 delay-0 group-hover/rail:opacity-100 group-hover/rail:delay-75`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="w-full flex-1" />

        <div className="w-full border-t border-[#EAEAEA]">
          <div className="flex w-[66px] items-center justify-center pt-4 pb-[22px]">
            <Image
              src="/school-logo.png"
              alt="Westbrook College"
              width={48}
              height={41}
              className="h-[41px] w-12 object-contain"
            />
          </div>
        </div>
      </nav>
    </div>
  );
}
