"use client";

import { useEffect } from "react";
import DocumentWorkspace from "@/app/documents/document-workspace";
import { ArtifactLinkedSidebar } from "@/components/artifact-linked-sidebar";
import {
  documentRecordFromArtifact,
  type DocumentArtifact,
} from "@/lib/mock-data";

/**
 * Full-screen overlay that opens the document writing surface for a
 * document artifact — same UI as /documents, dismissed via Escape / close.
 */
export default function DocumentArtifactDialog({
  artifact,
  onClose,
}: {
  artifact: DocumentArtifact;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div data-design-id="m-925dc75a2af2"
      className="fixed inset-y-0 right-0 left-[66px] z-30 flex bg-white"
      role="dialog"
      aria-modal="true"
      aria-label={artifact.title}
    >
      <DocumentWorkspace
        key={artifact.id}
        doc={documentRecordFromArtifact(artifact)}
        breadcrumbRoot="Artifacts"
        onClose={onClose}
      />
      <ArtifactLinkedSidebar artifactId={artifact.id} />
    </div>
  );
}
