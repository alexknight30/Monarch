import { redirect } from "next/navigation";
import { listAdminUsers } from "@/lib/local-db";
import { isDevView } from "@/lib/views";
import { getServerViewId } from "@/lib/views-server";
import VisibilityClient from "./visibility-client";

export default async function VisibilityPage() {
  const viewId = await getServerViewId();
  if (!isDevView(viewId)) redirect("/");

  const users = await listAdminUsers();
  return <VisibilityClient initialUsers={users} />;
}
