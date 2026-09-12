import { NextResponse } from "next/server";
import { resolveApiView } from "@/lib/api-view";
import { updateAdminUser, type UpdateAdminUserInput } from "@/lib/local-db";
import { ADMIN_USER_FIELDS, type AdminUserField } from "@/lib/mock-data";
import { isDevView } from "@/lib/views";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ viewId: string; id: string }> };

function pickUserFields(body: UpdateAdminUserInput): UpdateAdminUserInput {
  const patch: UpdateAdminUserInput = {};
  for (const field of ADMIN_USER_FIELDS) {
    const value = body[field as AdminUserField];
    if (typeof value === "string") patch[field] = value;
  }
  return patch;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { viewId: raw, id } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;
  if (!isDevView(resolved.viewId)) {
    return NextResponse.json(
      { error: "Users are only editable in the Dev view." },
      { status: 403 },
    );
  }

  let body: UpdateAdminUserInput;
  try {
    body = (await request.json()) as UpdateAdminUserInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const user = await updateAdminUser(decodeURIComponent(id), pickUserFields(body));
    return NextResponse.json({ user });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update user.";
    const status = message === "User not found." ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
