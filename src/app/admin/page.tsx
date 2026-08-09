import ViewSwitcher from "./view-switcher";
import { getServerViewId } from "@/lib/views-server";
import { getViewMeta } from "@/lib/views";

export default async function AdminPage() {
  const viewId = await getServerViewId();
  const active = getViewMeta(viewId);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto pt-13 pb-16">
      <div className="w-[560px]">
        <h1 className="font-display text-[34px] leading-[42px] tracking-[-0.015em] text-[#0A0A0A]">
          You&rsquo;re an admin, {active.firstName}
        </h1>
        <p className="pt-2.5 text-sm leading-5 text-[#6B6B6B]">
          Preview the app as another account. This page isn&rsquo;t linked in the
          nav — only reachable at <span className="text-[#0A0A0A]">/admin</span>.
        </p>

        <div className="mt-7 rounded-xl border border-[#E8E8E6] bg-white p-[22px]">
          <p className="text-[13px] leading-4 text-[#5E5E5E]">Currently viewing</p>
          <p className="pt-1.5 text-base leading-5 font-semibold tracking-[-0.005em] text-[#0A0A0A]">
            {active.label}
          </p>

          <div className="mt-[18px] border-t border-[#F0F0F0] pt-[18px]">
            <ViewSwitcher activeId={viewId} />
          </div>
        </div>
      </div>
    </div>
  );
}
