"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/admin", label: "Admin", match: (p: string) => p.startsWith("/admin") },
  { href: "/projects", label: "Projects", match: (p: string) => p.startsWith("/projects") },
];

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

  if (name === "Admin") {
    return (
      <svg width="19" height="19" viewBox="0 0 24 24" className="shrink-0">
        <rect x="3" y="3" width="18" height="18" rx="4" {...common} />
        <path d="M7.5 15l3.2-3.6 2.6 2.2 3.4-4.4" {...common} />
      </svg>
    );
  }

  return (
    <svg width="19" height="19" viewBox="0 0 24 24" className="shrink-0">
      <rect x="3" y="4.5" width="18" height="4.5" rx="1.4" {...common} />
      <path d="M5.2 9v9.4a1.8 1.8 0 0 0 1.8 1.8h10a1.8 1.8 0 0 0 1.8-1.8V9" {...common} />
      <path d="M10 13h4" {...common} />
    </svg>
  );
}

export default function Rail() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-[66px] shrink-0 flex-col items-center border-r border-[#EAEAEA] bg-white">
      <Link href="/" className="flex h-[66px] w-[66px] shrink-0 items-center justify-center">
        <svg width="27" height="27" viewBox="0 0 100 100" className="shrink-0">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.5 0H89.5C95.299 0 100 4.701 100 10.5V89.5C100 95.299 95.299 100 89.5 100H10.5C4.701 100 0 95.299 0 89.5V10.5C0 4.701 4.701 0 10.5 0ZM24 46V79.5C24 80.881 25.119 82 26.5 82H73.5C74.881 82 76 80.881 76 79.5V46C76 31.641 64.359 20 50 20C35.641 20 24 31.641 24 46Z"
            fill="#1F1E1C"
          />
        </svg>
      </Link>

      <div className="flex flex-col items-center gap-3 pt-5">
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                active ? "bg-[#F4F4F4]" : "hover:bg-[#F7F7F7]"
              }`}
            >
              <NavIcon name={item.label} active={active} />
            </Link>
          );
        })}
      </div>

      <div className="w-full flex-1" />

      <div className="flex w-full items-center justify-center border-t border-[#EAEAEA] pt-4 pb-[22px]">
        <Image
          src="/school-logo.png"
          alt="Westbrook College"
          width={48}
          height={41}
          className="h-[41px] w-12 object-contain"
        />
      </div>
    </nav>
  );
}
