export const USAGE_CATEGORIES = ["chat", "special", "setup"] as const;
export type UsageCategory = typeof USAGE_CATEGORIES[number];
export type UsageEntry = {
  id: string; at: string; category: UsageCategory; model: string; status: string;
  input: number | null; output: number | null; cached: number; reasoning: number;
  usd: number | null; costSource: "provider" | "estimate" | "unknown";
};
export type UsageTotal = { usd: number; tokens: number; input: number; output: number; cached: number; calls: number; unknown: number; estimated: number };
const empty = (): UsageTotal => ({ usd: 0, tokens: 0, input: 0, output: 0, cached: 0, calls: 0, unknown: 0, estimated: 0 });
const categories = () => Object.fromEntries(USAGE_CATEGORIES.map(key => [key, empty()])) as Record<UsageCategory, UsageTotal>;
const DAY = 86_400_000;
export function summarizeUsage(entries: UsageEntry[], startedAt: string, month: string, now = new Date()) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Choose a valid month.");
  const start = new Date(month + "-01T00:00:00Z");
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const days = Array.from({ length: (end.getTime() - start.getTime()) / DAY }, (_, i) => ({ date: new Date(start.getTime() + i * DAY).toISOString().slice(0, 10), categories: categories(), total: empty() }));
  const total = empty(), breakdown = categories();
  for (const entry of entries) {
    const at = new Date(entry.at);
    if (at < start || at >= end || at > now) continue;
    const day = days[at.getUTCDate() - 1];
    if (!day || !breakdown[entry.category]) continue;
    for (const bucket of [total, breakdown[entry.category], day.total, day.categories[entry.category]]) {
      bucket.usd += entry.usd ?? 0; bucket.input += entry.input ?? 0; bucket.output += entry.output ?? 0;
      bucket.tokens += (entry.input ?? 0) + (entry.output ?? 0); bucket.cached += entry.cached; bucket.calls++;
      if (entry.usd === null || entry.input === null || entry.output === null) bucket.unknown++;
      if (entry.costSource === "estimate") bucket.estimated++;
    }
  }
  const current = month === now.toISOString().slice(0, 7);
  const trackingDay = new Date(startedAt.slice(0, 10) + "T00:00:00Z").getTime();
  const observedDays = Math.max(0, Math.floor((Math.min(now.getTime(), end.getTime() - 1) - Math.max(start.getTime(), trackingDay)) / DAY) + 1);
  // Include zero-spend days. Treat today's partial day as a day, avoiding a
  // minutes-long setup burst being extrapolated into a huge monthly bill.
  const dailyRate = observedDays ? total.usd / observedDays : 0;
  const remainingDays = current ? Math.max(0, days.length - now.getUTCDate()) : 0;
  const forecast = current && observedDays >= 3 && total.calls > 0 && !total.unknown ? total.usd + dailyRate * remainingDays : null;
  let cumulative = 0;
  const trend = days.map(day => {
    cumulative += day.total.usd;
    const future = current && day.date > now.toISOString().slice(0, 10);
    return { date: day.date, actual: future || day.date < startedAt.slice(0, 10) ? null : cumulative, predicted: forecast !== null && day.date >= now.toISOString().slice(0, 10) ? total.usd + dailyRate * Math.max(0, Number(day.date.slice(8)) - now.getUTCDate()) : null };
  });
  return { month, startedAt, total, breakdown, days, trend, forecast, observedDays, current, currency: "USD" as const, timezone: "UTC" as const };
}
export type UsageSummary = ReturnType<typeof summarizeUsage>;
