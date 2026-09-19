"use client";

import { useRouter } from "next/navigation";
import DocumentWorkspace from "@/app/documents/document-workspace";
import { ArtifactLinkedSidebar } from "@/components/artifact-linked-sidebar";
import {
  documentRecordFromArtifact,
  type DocumentArtifact,
  type NotesArtifact,
} from "@/lib/mock-data";

/** Full-page writing surface for a document or notes artifact. */
export default function DocumentArtifactPage({
  artifact,
}: {
  artifact: DocumentArtifact | NotesArtifact;
}) {
  const router = useRouter();
  return (
    <div data-design-id="m-99cb416a33c4" className="flex min-h-0 flex-1">
      <DocumentWorkspace
        key={artifact.id}
        doc={documentRecordFromArtifact(artifact)}
        breadcrumbRoot="Artifacts"
        onClose={() => router.push("/artifacts")}
        variant={artifact.kind === "notes" ? "notes" : "document"}
      />
      <ArtifactLinkedSidebar artifactId={artifact.id} />
    </div>
  );
}
