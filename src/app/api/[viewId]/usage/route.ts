import { resolveApiView } from "@/lib/api-view";
import { readUsageLedger } from "@/lib/usage-store";
import { summarizeUsage } from "@/lib/usage-summary";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ viewId: string }> }) {
  const resolved = await resolveApiView((await context.params).viewId);
  if ("error" in resolved) return resolved.error;
  const month = new URL(request.url).searchParams.get("month") || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return Response.json({ error: "Choose a valid month." }, { status: 400 });
  try {
    const { entries, startedAt } = await readUsageLedger(resolved.viewId);
    return Response.json(summarizeUsage(entries, startedAt, month), { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Usage could not be loaded. Please retry." }, { status: 500 }); }
}
