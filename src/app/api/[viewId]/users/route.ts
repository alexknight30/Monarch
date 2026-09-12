import { NextResponse } from "next/server";
import { resolveApiView } from "@/lib/api-view";
import { createAdminUser } from "@/lib/local-db";
import { isDevView } from "@/lib/views";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ viewId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { viewId: raw } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;
  if (!isDevView(resolved.viewId)) {
    return NextResponse.json(
      { error: "Users are only editable in the Dev view." },
      { status: 403 },
    );
  }

  try {
    const user = await createAdminUser();
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add user.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
