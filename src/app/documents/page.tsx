import { redirect } from "next/navigation";

/** Documents live under Artifacts now — keep the old URL from 404ing. */
export default function DocumentsPage() {
  redirect("/artifacts");
}
