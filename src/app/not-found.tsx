"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { PlatedButton } from "@/components/ui/plated-button";
import { setActiveChatId } from "@/lib/chat-history";

function CropMarks() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <span className="absolute top-5 left-2 h-px w-[26px] bg-[#BFB8B6]" />
      <span className="absolute top-2 left-5 h-[26px] w-px bg-[#BFB8B6]" />
      <span className="absolute top-5 right-2 h-px w-[26px] bg-[#BFB8B6]" />
      <span className="absolute top-2 right-5 h-[26px] w-px bg-[#BFB8B6]" />
      <span className="absolute bottom-5 left-2 h-px w-[26px] bg-[#BFB8B6]" />
      <span className="absolute bottom-2 left-5 h-[26px] w-px bg-[#BFB8B6]" />
      <span className="absolute right-2 bottom-5 h-px w-[26px] bg-[#BFB8B6]" />
      <span className="absolute right-5 bottom-2 h-[26px] w-px bg-[#BFB8B6]" />
    </div>
  );
}

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-5 border border-[#E6E6E6]" />
      <CropMarks />

      <div className="relative flex h-full flex-col items-center justify-center px-10 py-12">
        <h1 className="[font-family:var(--font-neuton),Georgia,serif] text-[clamp(120px,16vw,210px)] leading-[0.9] font-bold tracking-[-0.015em] text-[#1A1A1A]">
          404
        </h1>
        <p className="mt-1 [font-family:var(--font-neuton),Georgia,serif] text-[40px] leading-11 tracking-[0.01em] text-[#1A1A1A]">
          ERROR
        </p>

        <div className="relative mt-4 w-full max-w-[1100px]">
          <Image
            src="/404-meadow.png"
            alt=""
            width={2388}
            height={480}
            className="h-auto w-full object-contain"
            priority
          />
        </div>

        <p className="mt-7 [font-family:var(--font-work-sans),system-ui,sans-serif] text-center text-[28px] leading-[38px] font-bold tracking-[-0.01em] text-[#1A1A1A]">
          Page not found. We can’t seem to locate the page you’re looking for.
        </p>
        <p className="mt-3 max-w-[720px] [font-family:var(--font-work-sans),system-ui,sans-serif] text-center text-[19px] leading-[30px] text-[#1A1A1A]">
          It might have been moved, deleted, or perhaps it flew away.
        </p>

        <div className="mt-8 flex items-center gap-6 [font-family:var(--font-work-sans),system-ui,sans-serif]">
          <PlatedButton
            faceClassName="h-[50px] w-[196px] text-lg font-medium text-[#1A1A1A]"
            onClick={() => {
              setActiveChatId(null);
              router.push("/?home=1");
            }}
          >
            Take Me Home
          </PlatedButton>
          <PlatedButton
            faceClassName="h-[50px] w-[184px] text-lg font-medium text-[#1A1A1A]"
            onClick={() => {
              if (window.history.length > 1) router.back();
              else {
                setActiveChatId(null);
                router.push("/?home=1");
              }
            }}
          >
            Search Again
          </PlatedButton>
        </div>
      </div>
    </div>
  );
}
