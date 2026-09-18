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
  isImage,
  isPdf,
} from "@/lib/syllabus/anthropic";
import { materializeProposal } from "@/lib/syllabus/materialize";
import type { ViewId } from "@/lib/views";
import {prepareSyllabusInput} from "./provider";

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
  signal?:AbortSignal,
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
    const source=await timed("upload",stages,()=>prepareSyllabusInput(document,signal));

    const [courseAgent, assignmentsAgent, scheduleAgent, tasksAgent] =
      await timed("fan-out", stages, () =>
        Promise.all([
          runCourseAgent(source),
          runAssignmentsAgent(source),
          runScheduleAgent(source),
          runTasksAgent(source),
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
