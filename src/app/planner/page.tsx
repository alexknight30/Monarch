import PlannerClient from "./planner-client";
import { getServerViewDataset } from "@/lib/views-server";

export default async function PlannerPage() {
  const { planner } = await getServerViewDataset();
  return <PlannerClient issues={planner} />;
}
