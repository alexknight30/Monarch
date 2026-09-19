"use client";
import { DesignCopy } from "@/components/design/runtime";


import Image from "next/image";
import { useRouter } from "next/navigation";
import { PlatedButton } from "@/components/ui/plated-button";
import { setActiveChatId } from "@/lib/chat-history";

function CropMarks() {
  return (
    <div data-design-id="m-3adf0d9ac605" aria-hidden className="pointer-events-none absolute inset-0">
      <span data-design-id="m-b3f111c636b0" className="absolute top-5 left-2 h-px w-[26px] bg-[#BFB8B6]" />
      <span data-design-id="m-557aa9fab90a" className="absolute top-2 left-5 h-[26px] w-px bg-[#BFB8B6]" />
      <span data-design-id="m-fe60eeb788b4" className="absolute top-5 right-2 h-px w-[26px] bg-[#BFB8B6]" />
      <span data-design-id="m-1d6212767efb" className="absolute top-2 right-5 h-[26px] w-px bg-[#BFB8B6]" />
      <span data-design-id="m-079ef189d02d" className="absolute bottom-5 left-2 h-px w-[26px] bg-[#BFB8B6]" />
      <span data-design-id="m-8d27a8617378" className="absolute bottom-2 left-5 h-[26px] w-px bg-[#BFB8B6]" />
      <span data-design-id="m-eb2a1e7305bd" className="absolute right-2 bottom-5 h-px w-[26px] bg-[#BFB8B6]" />
      <span data-design-id="m-0b42e89c68c2" className="absolute right-5 bottom-2 h-[26px] w-px bg-[#BFB8B6]" />
    </div>
  );
}

export default function NotFound() {
  const router = useRouter();

  return (
    <div data-design-id="m-d42d6dde691a" className="fixed inset-0 z-50 overflow-hidden bg-white">
      <div data-design-id="m-bccc8b6134d1" className="pointer-events-none absolute inset-5 border border-[#E6E6E6]" />
      <CropMarks />

      <div data-design-id="m-88b04c072485" className="relative flex h-full flex-col items-center justify-center px-10 py-12">
        <h1 data-design-id="m-7b581b4ca798" className="[font-family:var(--font-neuton),Georgia,serif] text-[clamp(120px,16vw,210px)] leading-[0.9] font-bold tracking-[-0.015em] text-[#1A1A1A]"><DesignCopy id="m-7b581b4ca798">
          404
        </DesignCopy></h1>
        <p data-design-id="m-5bf6d0f960b8" className="mt-1 [font-family:var(--font-neuton),Georgia,serif] text-[40px] leading-11 tracking-[0.01em] text-[#1A1A1A]"><DesignCopy id="m-5bf6d0f960b8">
          ERROR
        </DesignCopy></p>

        <div data-design-id="m-f59e850053cb" className="relative mt-4 w-full max-w-[1100px]">
          <Image
            src="/404-meadow.png"
            alt=""
            width={2388}
            height={480}
            className="h-auto w-full object-contain"
            priority
          />
        </div>

        <p data-design-id="m-aebce6059a1d" className="mt-7 [font-family:var(--font-work-sans),system-ui,sans-serif] text-center text-[28px] leading-[38px] font-bold tracking-[-0.01em] text-[#1A1A1A]"><DesignCopy id="m-aebce6059a1d">
          Page not found. We can’t seem to locate the page you’re looking for.
        </DesignCopy></p>
        <p data-design-id="m-46e4b6e836e8" className="mt-3 max-w-[720px] [font-family:var(--font-work-sans),system-ui,sans-serif] text-center text-[19px] leading-[30px] text-[#1A1A1A]"><DesignCopy id="m-46e4b6e836e8">
          It might have been moved, deleted, or perhaps it flew away.
        </DesignCopy></p>

        <div data-design-id="m-c6b13b6bf56b" className="mt-8 flex items-center gap-6 [font-family:var(--font-work-sans),system-ui,sans-serif]">
          <PlatedButton data-design-id="m-3abc09ca5489" data-design-key="m-3abc09ca5489"
            faceClassName="h-[50px] w-[196px] text-lg font-medium text-[#1A1A1A]"
            onClick={() => {
              setActiveChatId(null);
              router.push("/?home=1");
            }}
          ><DesignCopy id="m-3abc09ca5489">
            Take Me Home
          </DesignCopy></PlatedButton>
          <PlatedButton data-design-id="m-15e817dfbf7d" data-design-key="m-15e817dfbf7d"
            faceClassName="h-[50px] w-[184px] text-lg font-medium text-[#1A1A1A]"
            onClick={() => {
              if (window.history.length > 1) router.back();
              else {
                setActiveChatId(null);
                router.push("/?home=1");
              }
            }}
          ><DesignCopy id="m-15e817dfbf7d">
            Search Again
          </DesignCopy></PlatedButton>
        </div>
      </div>
    </div>
  );
}
