import ProjectsClient from "./projects-client";
import { getServerViewDataset } from "@/lib/views-server";

export default async function ProjectsPage() {
  const { projects } = await getServerViewDataset();
  return <ProjectsClient projects={projects} />;
}
