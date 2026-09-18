import type { HarnessTool } from "./tools";
import { readViewStore, patchArtifact } from "@/lib/local-db";
import { prepareStudyArtifact } from "@/lib/study-artifacts";
import { ARTIFACT_KINDS, isArtifactKind } from "@/lib/mock-data";

export const STUDY_TOOLS: HarnessTool[] = [
  {
    name: "get_course", facing: "agent", summary: "Read course details, policies, assignments and syllabus source records; omit id to list courses.",
    definition: { name: "get_course", description: "Read authoritative course facts, office hours, grading, AI policies and assignments. Omit id to list all courses.", input_schema: { type: "object", properties: { id: { type: "string" } }, additionalProperties: false } },
    async execute(ctx, input) {
      const store = await readViewStore(ctx.viewId);
      if (!input.id) return { result: { courses: store.courses.map(({ id, code, title, term }) => ({ id, code, title, term })) } };
      const course = store.courses.find((c) => c.id === input.id || c.slug === input.id || c.code === input.id);
      if (!course) throw new Error("Course not found. List courses first.");
      return { result: { course, assignments: store.assignments.filter((a) => a.courseSlug === course.slug), sources: store.documents.filter((d) => d.courseSlug === course.slug).map(({ id, filename }) => ({ id, filename })) } };
    },
  },
  {
    name: "create_artifact", facing: "multi", summary: "Create a saved study artifact with content, grounded in linked source artifacts.",
    definition: { name: "create_artifact", description: "Create and save an editable study guide, flashcard set, lesson, diagram, practice test, slides, notes or reading. Use source_ids for existing material. Returns its URL. Respect course guidelines; do not write graded submissions.", input_schema: { type: "object", properties: {
      title: { type: "string" }, kind: { type: "string", enum: [...ARTIFACT_KINDS] }, course_id: { type: "string" }, instructions: { type: "string" }, source_ids: { type: "array", items: { type: "string" } },
    }, required: ["title", "kind", "instructions"], additionalProperties: false } },
    async execute(ctx, input) {
      if (typeof input.title !== "string" || typeof input.kind !== "string" || !isArtifactKind(input.kind)) throw new Error("Provide a valid artifact kind and title.");
      const artifact = await prepareStudyArtifact(ctx.viewId, { title: input.title, kind: input.kind,
        courseId: typeof input.course_id === "string" ? input.course_id : undefined,
        source: typeof input.instructions === "string" ? input.instructions : "",
        sourceIds: Array.isArray(input.source_ids) ? input.source_ids as string[] : [] }, true);
      return { result: { id: artifact.id, kind: artifact.kind, title: artifact.title, url: `/artifacts/${artifact.slug}` }, action: { tool: "create_artifact", key: artifact.slug, summary: `Created ${artifact.kind} “${artifact.title}”` } };
    },
  },
  {
    name: "update_study_artifact", facing: "agent", summary: "Save revised flashcards, questions, lesson blocks or slides after reading an artifact.",
    definition: { name: "update_study_artifact", description: "Update a saved artifact's content. Read the full existing content first and preserve items not being changed. Changes must support learning rather than complete graded work.", input_schema: { type: "object", properties: {
      id: { type: "string" }, content_json: { type: "string", description: "JSON object with cards, items, blocks, slides, or bodyText as appropriate; preserve existing item ids." },
    }, required: ["id", "content_json"], additionalProperties: false } },
    async execute(ctx, input) {
      const store = await readViewStore(ctx.viewId);
      const existing = store.artifacts.find((a) => a.id === input.id || a.slug === input.id);
      if (!existing) throw new Error("Artifact not found.");
      const fields: Record<string, string> = { flashcards: "cards", "practice-test": "items", lesson: "blocks", slides: "slides", reading: "bodyText" };
      const field = fields[existing.kind];
      if (!field) throw new Error("Use the document or whiteboard editor for this artifact.");
      const data = JSON.parse(String(input.content_json)) as Record<string, unknown>;
      if (field === "bodyText" ? typeof data[field] !== "string" : !Array.isArray(data[field])) throw new Error(`Provide ${field}.`);
      const base=ctx.artifactReads?.get(existing.id);
      if(!base)throw new Error("Read the artifact with read_object before changing it, and preserve items outside your intended change.");
      const saved = await patchArtifact(ctx.viewId, existing.id, { [field]: data[field] },base);
      ctx.artifactReads?.set(saved.id,saved as unknown as Record<string,unknown>);
      ctx.artifactReads?.set(saved.slug,saved as unknown as Record<string,unknown>);
      return { result: { id: saved.id, url: `/artifacts/${saved.slug}` }, action: { tool: "update_study_artifact", key: saved.slug, summary: `Updated “${saved.title}”` } };
    },
  },
];
