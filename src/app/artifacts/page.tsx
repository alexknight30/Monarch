import ArtifactsClient from "./artifacts-client";
import { getServerViewId } from "@/lib/views-server";
import { readViewStore } from "@/lib/local-db";

export default async function ArtifactsPage() {
  const { artifacts,courses,trash } = await readViewStore(await getServerViewId());
  return <ArtifactsClient artifacts={artifacts} courses={courses} trashed={trash.map(item=>({id:item.artifact.id,title:item.artifact.title,kind:item.artifact.kind,deletedAt:item.deletedAt}))} />;
}
