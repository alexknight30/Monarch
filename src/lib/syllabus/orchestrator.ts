import {
  createIngestRun,
  getSourceDocument,
  updateIngestRun,
  updateSourceDocument,
} from "@/lib/local-db";
import type { IngestStage, Proposal } from "@/lib/source-documents";
import {
  runAssignmentsAgent,
  runCourseAgent,
  runScheduleAgent,
  runTasksAgent,
} from "@/lib/syllabus/agents";
import {
  anthropicClient,
  isImage,
  isPdf,
  uploadSyllabusFile,
} from "@/lib/syllabus/anthropic";
import { materializeProposal } from "@/lib/syllabus/materialize";
import type { ViewId } from "@/lib/views";

async function timed<T>(
  name: string,
  stages: IngestStage[],
  fn: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  stages.push({ name, status: "running", ms: 0 });
  try {
    const result = await fn();
    const stage = stages[stages.length - 1];
    stage.status = "done";
    stage.ms = Date.now() - started;
    return result;
  } catch (error) {
    const stage = stages[stages.length - 1];
    stage.status = "failed";
    stage.ms = Date.now() - started;
    stage.error = error instanceof Error ? error.message : "Stage failed.";
    throw error;
  }
}

export async function runSyllabusIngest(
  viewId: ViewId,
  documentId: string,
): Promise<Proposal> {
  const document = await getSourceDocument(viewId, documentId);
  if (!document) throw new Error("Document not found.");
  if (!isPdf(document.mime) && !isImage(document.mime)) {
    throw new Error("Only PDF and image syllabi can be ingested.");
  }

  const run = await createIngestRun(viewId, documentId);
  const stages: IngestStage[] = [];
  await updateSourceDocument(viewId, documentId, { status: "extracting" });

  try {
    const client = anthropicClient();
    const fileApiId =
      document.fileApiId ??
      (await timed("upload", stages, async () => {
        const id = await uploadSyllabusFile({
          client,
          storedPath: document.storedPath,
          filename: document.filename,
          mime: document.mime,
        });
        await updateSourceDocument(viewId, documentId, { fileApiId: id });
        return id;
      }));

    if (document.fileApiId) {
      stages.push({ name: "upload", status: "done", ms: 0 });
    }

    const [courseAgent, assignmentsAgent, scheduleAgent, tasksAgent] =
      await timed("fan-out", stages, () =>
        Promise.all([
          runCourseAgent({ client, fileApiId, mime: document.mime }),
          runAssignmentsAgent({ client, fileApiId, mime: document.mime }),
          runScheduleAgent({ client, fileApiId, mime: document.mime }),
          runTasksAgent({ client, fileApiId, mime: document.mime }),
        ]),
      );

    await updateSourceDocument(viewId, documentId, { status: "extracted" });
    await updateIngestRun(viewId, run.id, { stages: [...stages] });

    const proposal = await timed("materialize", stages, async () =>
      materializeProposal({
        runId: run.id,
        documentId,
        courseAgent,
        assignmentsAgent,
        scheduleAgent,
        tasksAgent,
      }),
    );

    await updateIngestRun(viewId, run.id, {
      status: "proposed",
      stages,
      proposal,
    });
    return proposal;
  } catch (error) {
    await updateSourceDocument(viewId, documentId, { status: "failed" });
    await updateIngestRun(viewId, run.id, { status: "failed", stages });
    throw error;
  }
}
