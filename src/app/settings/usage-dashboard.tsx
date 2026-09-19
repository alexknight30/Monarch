"use client";
import { DesignCopy } from "@/components/design/runtime";

import { useEffect, useState } from "react";
import { useViewId } from "@/components/view-provider";
import { USAGE_CATEGORIES, type UsageSummary, type UsageCategory } from "@/lib/usage-summary";

const labels: Record<UsageCategory, string> = { chat: "Normal chats", special: "Special requests", setup: "Syllabus setup" };
const colors: Record<UsageCategory, string> = { chat: "#6366f1", special: "#f59e0b", setup: "#10b981" };
const dollars = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: value > 0 && value < .01 ? 4 : 2 }).format(value);
const count = (value: number) => new Intl.NumberFormat("en-US").format(value);
const control = "rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600 disabled:opacity-40";

export default function UsageDashboard() {
  const viewId = useViewId();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [metric, setMetric] = useState<"usd" | "tokens">("usd");
  const [data, setData] = useState<(UsageSummary & { viewId: string }) | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    const load = async () => {
      if (pending) return;
      pending = true;
      try {
        setLoading(true); setError("");
        const response = await fetch(`/api/${viewId}/usage?month=${month}`, { signal: controller.signal, cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load usage.");
        if (!controller.signal.aborted) setData({ ...result, viewId });
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load usage."); }
      finally { pending = false; if (!controller.signal.aborted) setLoading(false); }
    };
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [viewId, month, refresh]);
  const shown = data?.month === month && data.viewId === viewId ? data : null;
  const maximum = Math.max(...(shown?.days.map(day => day.total[metric]) || []), metric === "usd" ? .01 : 1);
  const format = (value: number) => metric === "usd" ? dollars(value) : count(value) + " tokens";
  return <section data-design-id="m-42c2e4f8e94b" className="mt-8 space-y-6" aria-label="AI usage dashboard" aria-busy={loading}>
    <div data-design-id="m-51d6bf5138f5" className="flex flex-wrap items-start justify-between gap-4"><div data-design-id="m-407e9655ae8b"><h2 data-design-id="m-e42637731335" className="text-lg font-semibold tracking-tight"><DesignCopy id="m-e42637731335">Your AI usage</DesignCopy></h2><p data-design-id="m-3eb3168181c7" className="mt-1 text-sm text-stone-500"><DesignCopy id="m-3eb3168181c7">See where your tokens and spending go.</DesignCopy></p></div><div data-design-id="m-74cb5367a443" className="flex gap-2"><input data-design-id="m-76893d7c732a" aria-label="Usage month" type="month" value={month} max={new Date().toISOString().slice(0, 7)} onChange={event => { if (event.target.value) setMonth(event.target.value); }} className={control} /><button data-design-id="m-dc838a8b1c31" className={control} disabled={loading} onClick={() => setRefresh(value => value + 1)}>{loading ? "Updating…" : "Refresh"}</button></div></div>
    {error && <p data-design-id="m-785fef1ea325" role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error} <button data-design-id="m-f3ba7b688c09" className="underline" onClick={() => setRefresh(value => value + 1)}><DesignCopy id="m-f3ba7b688c09">Retry</DesignCopy></button></p>}
    {!shown ? <div data-design-id="m-48189741fa2c" role="status" className="rounded-2xl border border-stone-200 p-8 text-sm text-stone-500">{error ? "Usage is unavailable right now." : "Loading your usage…"}</div> : <>
      <div data-design-id="m-74d25782e577" className="grid gap-4 sm:grid-cols-3">
        <Stat label="Recorded spend" value={shown.total.calls && shown.total.unknown === shown.total.calls && shown.total.usd === 0 ? "Unavailable" : dollars(shown.total.usd)} detail={`${shown.month} · USD`} />
        <Stat label="Tokens used" value={count(shown.total.tokens)} detail={`${count(shown.total.input)} input · ${count(shown.total.output)} output`} />
        <Stat label="Expected month-end spend" value={shown.forecast === null ? "—" : dollars(shown.forecast)} detail={!shown.current ? "Select this month for a forecast" : shown.total.unknown ? "Incomplete usage; forecast unavailable" : shown.forecast === null ? "Needs 3 tracked days and recorded usage" : `Based on ${shown.observedDays} tracked days`} />
      </div>
      {!shown.total.calls && <div data-design-id="m-e599ca749f5b" className="rounded-xl bg-stone-50 p-5 text-sm text-stone-600"><DesignCopy id="m-e599ca749f5b">No recorded AI usage in this month yet. Chat, create study material, or import a syllabus to start filling this dashboard.</DesignCopy></div>}
      <div data-design-id="m-a838d5ee2f93" className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        <div data-design-id="m-8b61e1063144" className="flex flex-wrap items-center justify-between gap-3"><h3 data-design-id="m-335693251afe" className="font-medium"><DesignCopy id="m-335693251afe">Daily usage</DesignCopy></h3><div data-design-id="m-6c6319e0e433" className="flex gap-1 rounded-lg bg-stone-100 p-1">{(["usd", "tokens"] as const).map(key => <button data-design-id="m-b847c2707edf" key={key} aria-pressed={metric === key} onClick={() => setMetric(key)} className={"rounded-md px-3 py-1 text-xs " + (metric === key ? "bg-white font-medium shadow-sm" : "text-stone-500")}>{key === "usd" ? "Cost" : "Tokens"}</button>)}</div></div>
        <div data-design-id="m-ce4411ea982f" className="mt-4 flex flex-wrap gap-4 text-xs text-stone-500">{USAGE_CATEGORIES.map(key => <span data-design-id="m-5e53ae1d6717" key={key} className="inline-flex items-center gap-2"><span data-design-id="m-dcee35c7308c" className="size-2.5 rounded-sm" style={{ background: colors[key] }} />{labels[key]}</span>)}</div>
        <div data-design-id="m-d1f7d2873d8a" className="mt-6 text-[11px] text-stone-400">{format(maximum)}</div>
        <div data-design-id="m-9515712f8826" className="mt-2 flex h-44 items-end gap-[3px] border-b border-stone-200" role="img" aria-label={`Daily ${metric === "usd" ? "spending" : "token usage"}, stacked by category. Details are available in the daily table below.`}>
          {shown.days.map(day => <div data-design-id="m-8b3b40ed105b" data-design-key={day.date} key={day.date} tabIndex={0} className="flex h-full min-w-0 flex-1 flex-col justify-end rounded-t-sm focus-visible:outline-2 focus-visible:outline-stone-700" title={`${day.date}: ${format(day.total[metric])}\n${USAGE_CATEGORIES.map(key => `${labels[key]}: ${format(day.categories[key][metric])}`).join("\n")}`} aria-label={`${day.date}: ${format(day.total[metric])}`}>
            {[...USAGE_CATEGORIES].reverse().map(key => <div data-design-id="m-877b6b0d6801" key={key} style={{ height: `${day.categories[key][metric] / maximum * 100}%`, background: colors[key] }} />)}
          </div>)}
        </div>
        <div data-design-id="m-2f6561d4240a" className="mt-2 flex justify-between text-[11px] text-stone-400"><span data-design-id="m-a6daff5f66fa">1 {new Date(month + "-01T12:00:00Z").toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}</span><span data-design-id="m-121506263e77">{shown.days.length}</span></div>
        <div data-design-id="m-99dc84d8353a" className="mt-6 space-y-4">{USAGE_CATEGORIES.map(key => <div data-design-id="m-dc8158f0c7fc" key={key}><div data-design-id="m-7628a7952226" className="mb-1.5 flex flex-wrap justify-between gap-2 text-xs"><span data-design-id="m-4b83f2a1b0a8" className="font-medium text-stone-600">{labels[key]}</span><span data-design-id="m-fea7b7db97a9" className="text-stone-500">{dollars(shown.breakdown[key].usd)} · {count(shown.breakdown[key].tokens)} tokens</span></div><div data-design-id="m-56651bb93694" className="h-2 overflow-hidden rounded-full bg-stone-100"><div data-design-id="m-621e1746e48c" className="h-full rounded-full" style={{ background: colors[key], width: `${shown.total[metric] ? shown.breakdown[key][metric] / shown.total[metric] * 100 : 0}%` }} /></div></div>)}</div>
      </div>
      <Forecast data={shown} />
      <details data-design-id="m-14cb97f2c988" className="rounded-xl border border-stone-200 p-4"><summary data-design-id="m-2d024e01ff7d" className="cursor-pointer text-sm text-stone-600"><DesignCopy id="m-2d024e01ff7d">Daily breakdown</DesignCopy></summary><div data-design-id="m-cabf5860908f" className="mt-4 overflow-x-auto"><table data-design-id="m-598a33e7224d" className="w-full text-left text-xs"><thead data-design-id="m-18a8e98de1e3"><tr data-design-id="m-78f183801fba"><th data-design-id="m-a198afff4aea" className="p-2"><DesignCopy id="m-a198afff4aea">Date (UTC)</DesignCopy></th>{USAGE_CATEGORIES.map(key => <th data-design-id="m-2e8dcbb782a7" className="p-2" key={key}>{labels[key]}</th>)}<th data-design-id="m-82af9b8ccad7" className="p-2"><DesignCopy id="m-82af9b8ccad7">Total</DesignCopy></th></tr></thead><tbody data-design-id="m-987a65026bf9">{shown.days.map(day => <tr data-design-id="m-703777bf01e4" data-design-key={day.date} className="border-t border-stone-100" key={day.date}><td data-design-id="m-998a52124d9a" className="p-2">{day.date}</td>{USAGE_CATEGORIES.map(key => <td data-design-id="m-59f899eb51d7" className="p-2" key={key}>{format(day.categories[key][metric])}</td>)}<td data-design-id="m-f7a09c566ae2" className="p-2">{format(day.total[metric])}</td></tr>)}</tbody></table></div></details>
      <div data-design-id="m-e0bfa6a03445" className="space-y-2 text-xs leading-5 text-stone-500">
        <p data-design-id="m-95ba8fdfade2">Tracking since {new Date(shown.startedAt).toLocaleString()}. Earlier usage and activity outside Monarch are not included. Days and months use UTC. Updates every 30 seconds.</p>
        <p data-design-id="m-a3d53c1f79d2"><DesignCopy id="m-a3d53c1f79d2">Normal chats include follow-ups and chat titles. Special requests include study-material generation, diagrams, slash-command skills, and lesson feedback. Setup includes syllabus extraction.</DesignCopy></p>
        <p data-design-id="m-345a014d422f">{count(shown.total.cached)} cached input tokens · {count(shown.total.calls)} model calls. Input totals include cached tokens; output totals already include reasoning.</p>
        <p data-design-id="m-56c8b6d03c17">Costs use provider-reported charges when available; otherwise they use <a data-design-id="m-deddb33ab457" className="underline" href="https://docs.x.ai/developers/pricing" target="_blank" rel="noreferrer"><DesignCopy id="m-deddb33ab457">xAI list prices</DesignCopy></a> checked September 17, 2026. {shown.total.estimated > 0 ? `${shown.total.estimated} calls use estimated costs, which may exclude unreported tool fees. ` : ""}Models without verified prices show incomplete costs. This is a usage record, not your provider invoice or credit balance.</p>
        {!!shown.total.unknown && <p data-design-id="m-5a45c2857063" className="rounded-lg bg-amber-50 p-3 text-amber-800">{shown.total.unknown} calls lack complete usage data, often because a response was interrupted. Totals are partial; missing usage is not treated as free.</p>}
      </div>
    </>}
  </section>;
}
function Stat({ label, value, detail }: { label: string; value: string; detail: string }) { return <div data-design-id="m-501587a0d721" className="rounded-2xl border border-stone-200 bg-white p-5"><p data-design-id="m-3eb86797acc1" className="text-xs text-stone-500">{label}</p><p data-design-id="m-95f2d118ec06" className="mt-3 text-3xl font-medium tracking-tight">{value}</p><p data-design-id="m-132e4af36e17" className="mt-2 text-xs leading-5 text-stone-400">{detail}</p></div>; }
function Forecast({ data }: { data: UsageSummary }) {
  const max = Math.max(.01, data.total.usd, data.forecast ?? 0);
  const x = (i: number) => 48 + i / Math.max(1, data.trend.length - 1) * 604;
  const y = (value: number) => 188 - value / max * 152;
  const points = (key: "actual" | "predicted") => data.trend.flatMap((day, i) => day[key] === null ? [] : [`${x(i)},${y(day[key]!)}`]).join(" ");
  return <div data-design-id="m-a47c637dbdb5" className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"><h3 data-design-id="m-d2d38a25f026" className="font-medium"><DesignCopy id="m-d2d38a25f026">Monthly spending forecast</DesignCopy></h3><p data-design-id="m-baa1a01e77e0" className="mt-1 text-xs leading-5 text-stone-500"><DesignCopy id="m-baa1a01e77e0">Solid line: recorded cumulative spend. Dashed line: projected spend if your daily average continues.</DesignCopy></p>
    <svg viewBox="0 0 680 224" className="mt-4 w-full" role="img" aria-label={data.forecast === null ? "Recorded monthly spending. Not enough complete data for a forecast." : `Recorded spending ${dollars(data.total.usd)}. Projected month-end spending ${dollars(data.forecast)}.`}>
      {[0, .5, 1].map(fraction => <g key={fraction}><line x1={48} x2={652} y1={y(max * fraction)} y2={y(max * fraction)} stroke="#e7e5e4" /><text data-design-id="m-ceb6aa81e683" x={40} y={y(max * fraction) + 4} textAnchor="end" fontSize={10} fill="#78716c">{dollars(max * fraction)}</text></g>)}
      <polyline points={points("actual")} fill="none" stroke="#292524" strokeWidth={2.5} />
      <polyline points={points("predicted")} fill="none" stroke="#8b5cf6" strokeWidth={2.5} strokeDasharray="6 5" />
      {data.trend.map((day, i) => day.actual !== null && <circle key={day.date} cx={x(i)} cy={y(day.actual)} r={3} fill="#292524"><title data-design-id="m-e304014dccb0">{day.date}: {dollars(day.actual)}</title></circle>)}
      <text data-design-id="m-39d66bae3037" x={48} y={214} fontSize={10} fill="#78716c"><DesignCopy id="m-39d66bae3037">Day 1</DesignCopy></text><text data-design-id="m-1d8565515bf0" x={652} y={214} textAnchor="end" fontSize={10} fill="#78716c">Day {data.days.length}</text>
    </svg>
    <p data-design-id="m-0c06effa8b24" className="text-xs leading-5 text-stone-500">{data.forecast === null ? "The forecast appears for the current month after at least three tracked calendar days with complete usage data." : "Projection uses all tracked days this month, including days with no spending and today’s partial day. Setup spikes can raise the estimate; it will settle as more days are recorded."}</p>
  </div>;
}
