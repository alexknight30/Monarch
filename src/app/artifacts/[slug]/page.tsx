import { notFound } from "next/navigation";
import DiagramArtifactPage from "../whiteboard-page";
import DocumentArtifactPage from "../document-artifact-page";
import FlashcardsArtifactPage from "../flashcards-artifact-page";
import LessonArtifactPage from "../lesson-artifact-page";
import PracticeTestArtifactPage from "../practice-test-artifact-page";
import ReadingArtifactPage from "../reading-artifact-page";
import SlidesArtifactPage from "../slides-artifact-page";
import {
  isDiagramArtifact,
  isFlashcardsArtifact,
  isLessonArtifact,
  isPracticeTestArtifact,
  isReadingArtifact,
  isSlidesArtifact,
  isTextArtifact,
} from "@/lib/mock-data";
import { getServerViewDataset } from "@/lib/views-server";

export default async function ArtifactDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { artifacts } = await getServerViewDataset();
  const artifact = artifacts.find((item) => item.slug === slug || item.id === slug);
  if (!artifact) notFound();

  if (isTextArtifact(artifact)) {
    return <DocumentArtifactPage key={artifact.id} artifact={artifact} />;
  }
  if (isDiagramArtifact(artifact)) {
    return <DiagramArtifactPage key={artifact.id} artifact={artifact} />;
  }
  if (isReadingArtifact(artifact)) {
    return <ReadingArtifactPage key={artifact.id} artifact={artifact} />;
  }
  if (isFlashcardsArtifact(artifact)) {
    return <FlashcardsArtifactPage key={artifact.id} artifact={artifact} />;
  }
  if (isPracticeTestArtifact(artifact)) {
    return <PracticeTestArtifactPage key={artifact.id} artifact={artifact} />;
  }
  if (isLessonArtifact(artifact)) {
    return <LessonArtifactPage key={artifact.id} artifact={artifact} />;
  }
  if (isSlidesArtifact(artifact)) {
    return <SlidesArtifactPage key={artifact.id} artifact={artifact} />;
  }

  notFound();
}
