"use client";

import { useRouter } from "next/navigation";
import DocumentWorkspace from "@/app/documents/document-workspace";
import { LinkedObjectsPanel } from "@/components/linked-objects-panel";
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
    <div className="flex min-h-0 flex-1">
      <DocumentWorkspace
        doc={documentRecordFromArtifact(artifact)}
        breadcrumbRoot="Artifacts"
        onClose={() => router.push("/artifacts")}
        variant={artifact.kind === "notes" ? "notes" : "document"}
      />
      <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l border-[#EFEFEA] bg-[#FBFBFA] p-4 lg:block">
        <LinkedObjectsPanel object={{ kind: "artifact", id: artifact.id }} />
      </aside>
    </div>
  );
}
