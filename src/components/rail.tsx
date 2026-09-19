"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "@/components/nav-icons";
import { useViewId } from "@/components/view-provider";
import { setActiveChatId } from "@/lib/chat-history";
import { isDevView } from "@/lib/views";

type NavItem = {
  href: string;
  label: string;
  match: (p: string) => boolean;
  onClick?: () => void;
};

// `/admin` (the view switcher) is deliberately absent: URL-only, and the rail
// hides itself there entirely. `/visibility` is the admin console, and only
// appears in the Dev view.
const NAV: NavItem[] = [
  {
    href: "/?home=1",
    label: "Chat",
    match: (p: string) => p === "/" || p.startsWith("/chat"),
    onClick: () => setActiveChatId(null),
  },
  { href: "/calendar", label: "Calendar", match: (p: string) => p.startsWith("/calendar") },
  { href: "/planner", label: "Planner", match: (p: string) => p.startsWith("/planner") },
  { href: "/visibility", label: "Visibility", match: (p: string) => p.startsWith("/visibility") },
  { href: "/artifacts", label: "Artifacts", match: (p: string) => p.startsWith("/artifacts") },
  { href: "/courses", label: "Courses", match: (p: string) => p.startsWith("/courses") },
];

const SETTINGS: NavItem = {
  href: "/settings",
  label: "Settings",
  match: (p: string) => p.startsWith("/settings"),
};

function RailLink({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const active = item.match(pathname);
  return (
    <Link data-design-id="m-01bed00a2612"
      href={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      onClick={item.onClick}
      className="flex h-11 w-full items-center"
    >
      <span data-design-id="m-b5697c7e80ac" className="flex h-11 w-[66px] shrink-0 items-center justify-center">
        <NavIcon name={item.label} active={active} />
      </span>
      <span data-design-id="m-116fb49816e4"
        className={`truncate pr-3 text-sm leading-[18px] whitespace-nowrap transition-opacity duration-200 ease-out ${
          active ? "font-semibold text-[#1A1A1A]" : "font-normal text-[#6B675F]"
        } opacity-0 delay-0 group-hover/rail:opacity-100 group-hover/rail:delay-75`}
      >
        {item.label}
      </span>
    </Link>
  );
}

/** The view switcher renders chrome-free. */
const HIDDEN_ON = ["/admin"];

export default function Rail() {
  const pathname = usePathname();
  const viewId = useViewId();
  if (HIDDEN_ON.includes(pathname)) return null;

  const items = NAV.filter(
    (item) => item.href !== "/visibility" || isDevView(viewId),
  );

  // Spacer keeps page layout fixed at the collapsed width; the real nav overlays
  // and grows to the right so icons never shift.
  return (
    <div data-design-id="m-9689c37329ec" className="relative h-full w-[66px] shrink-0">
      <nav data-design-id="m-97c8a8ea93a4" className="group/rail absolute inset-y-0 left-0 z-40 flex h-full w-[66px] flex-col overflow-hidden bg-[#F5F3EE] transition-[width,box-shadow] duration-200 ease-out hover:w-[196px] hover:shadow-[4px_0_24px_rgba(0,0,0,0.06)]">
        <Link data-design-id="m-6a7bf7849e01"
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

        <div data-design-id="m-3745cd7d201b" className="flex flex-col gap-1 pt-3">
          {items.map((item) => (
            <RailLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>

        <div data-design-id="m-05ea4ba81f79" className="w-full flex-1" />

        <div data-design-id="m-6205457515f6" className="pb-3">
          <RailLink item={SETTINGS} pathname={pathname} />
        </div>
      </nav>
    </div>
  );
}
