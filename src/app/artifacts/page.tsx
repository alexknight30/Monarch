import ArtifactsClient from "./artifacts-client";
import { getServerViewDataset } from "@/lib/views-server";

export default async function ArtifactsPage() {
  const { artifacts } = await getServerViewDataset();
  return <ArtifactsClient artifacts={artifacts} />;
}
