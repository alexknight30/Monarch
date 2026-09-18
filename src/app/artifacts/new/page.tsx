import { getServerViewDataset } from "@/lib/views-server";
import NewArtifact from "./new-artifact";
export default async function NewArtifactPage() {
  const { courses, artifacts } = await getServerViewDataset();
  return <NewArtifact courses={courses} artifacts={artifacts} />;
}
