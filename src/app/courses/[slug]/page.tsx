import { notFound } from "next/navigation";
import {
  artifactBelongsToCourse,
  issueBelongsToCourse,
} from "@/lib/course-context";
import { readViewStore } from "@/lib/local-db";
import { isReadingArtifact } from "@/lib/mock-data";
import { getServerViewId } from "@/lib/views-server";
import CourseDetailClient from "../course-detail-client";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const viewId = await getServerViewId();
  const store = await readViewStore(viewId);
  const course = store.courses.find((item) => item.slug === slug);
  if (!course) notFound();

  const documents = store.documents
    .filter(
      (doc) => doc.courseSlug === slug || doc.id === course.sourceDocumentId,
    )
    .map(({ id, filename, mime, sizeBytes }) => ({
      id,
      filename,
      mime,
      sizeBytes,
    }));

  const readingAssignments = store.assignments.filter(
    (assignment) =>
      assignment.courseSlug === slug && assignment.type === "reading",
  );

  const courseArtifacts = store.artifacts.filter((artifact) =>
    artifactBelongsToCourse(artifact, course),
  );
  const readingArtifacts = courseArtifacts.filter(isReadingArtifact);

  return (
    <CourseDetailClient
      course={course}
      viewId={viewId}
      documents={documents}
      readingAssignments={readingAssignments}
      readingArtifacts={readingArtifacts.map((artifact) => ({
        slug: artifact.slug,
        title: artifact.title,
      }))}
      artifacts={courseArtifacts}
      events={store.calendar.filter(
        (event) => event.courseSlug === slug || event.courseId === course.id,
      )}
      tasks={store.planner.filter((issue) =>
        issueBelongsToCourse(issue, course),
      )}
    />
  );
}
