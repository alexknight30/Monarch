import { NextResponse } from "next/server";
import { isViewId } from "@/lib/local-db";
import { getServerViewId } from "@/lib/views-server";
import type { ViewId } from "@/lib/views";

/**
 * Resolve `/api/[viewId]/...` against the active admin cookie.
 * Path folder and cookie must agree so each view only writes its own store.
 */
export async function resolveApiView(
  rawViewId: string,
): Promise<{ viewId: ViewId } | { error: NextResponse }> {
  if (!isViewId(rawViewId)) {
    return {
      error: NextResponse.json({ error: "Unknown view." }, { status: 404 }),
    };
  }

  const cookieView = await getServerViewId();
  if (cookieView !== rawViewId) {
    return {
      error: NextResponse.json(
        {
          error: `Active view is "${cookieView}", not "${rawViewId}". Switch views in /admin first.`,
        },
        { status: 403 },
      ),
    };
  }

  return { viewId: rawViewId };
}
