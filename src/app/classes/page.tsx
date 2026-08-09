import ClassesClient from "./classes-client";
import { getServerViewDataset } from "@/lib/views-server";

export default async function ClassesPage() {
  const { classes } = await getServerViewDataset();
  return <ClassesClient classes={classes} />;
}
