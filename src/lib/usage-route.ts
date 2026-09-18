import { getServerViewId } from "./views-server";
import { ensureUsageLedger, usageContext } from "./usage-store";
import type { UsageCategory } from "./usage-summary";

export function withUsageRequest<Args extends unknown[], Result>(category: UsageCategory, handler: (...args: Args) => Promise<Result>) {
  return async (...args: Args): Promise<Result> => {
    const viewId = await getServerViewId();
    await ensureUsageLedger(viewId);
    return usageContext.run({ viewId, category }, () => handler(...args));
  };
}
