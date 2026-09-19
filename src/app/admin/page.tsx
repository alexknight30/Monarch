
import { DesignCopy } from "@/components/design/runtime";
import ViewSwitcher from "./view-switcher";
import { getServerViewId } from "@/lib/views-server";
import { getViewMeta } from "@/lib/views";

export default async function AdminPage() {
  const viewId = await getServerViewId();
  const active = getViewMeta(viewId);

  return (
    <div data-design-id="m-62ab5042c3a8" className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto pt-13 pb-16">
      <div data-design-id="m-7d438fc0c1d8" className="w-[560px]">
        <h1 data-design-id="m-133c070d30f2" className="font-display text-[34px] leading-[42px] tracking-[-0.015em] text-[#0A0A0A]">
          You&rsquo;re an admin, {active.firstName}
        </h1>
        <p data-design-id="m-e60be9f87594" className="pt-2.5 text-sm leading-5 text-[#6B6B6B]">
          Preview the app as another account. This page isn&rsquo;t linked in the
          nav — only reachable at <span data-design-id="m-a2cbd609b305" className="text-[#0A0A0A]"><DesignCopy id="m-a2cbd609b305">/admin</DesignCopy></span>.
        </p>

        <div data-design-id="m-ee19f85d5d32" className="mt-7 rounded-xl border border-[#E8E8E6] bg-white p-[22px]">
          <p data-design-id="m-8450d16b1dcd" className="text-[13px] leading-4 text-[#5E5E5E]"><DesignCopy id="m-8450d16b1dcd">Currently viewing</DesignCopy></p>
          <p data-design-id="m-643277f65a6e" className="pt-1.5 text-base leading-5 font-semibold tracking-[-0.005em] text-[#0A0A0A]">
            {active.label}
          </p>

          <div data-design-id="m-c0996de61e24" className="mt-[18px] border-t border-[#F0F0F0] pt-[18px]">
            <ViewSwitcher activeId={viewId} />
          </div>
        </div>
      </div>
    </div>
  );
}
