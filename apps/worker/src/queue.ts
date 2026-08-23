import type { PgBoss, QueueOptions, SendOptions } from "pg-boss";

import { runGbifImportJob, type GbifImportJob } from "./index.js";

export const GBIF_IMPORT_QUEUE = "wachuma.gbif.import";
export const GBIF_IMPORT_DEAD_LETTER_QUEUE = "wachuma.gbif.import.failed";

export const gbifQueueOptions: QueueOptions = {
  retryLimit: 5,
  retryDelay: 5,
  retryBackoff: true,
  retryDelayMax: 900,
  retentionSeconds: 14 * 24 * 60 * 60,
  deleteAfterSeconds: 7 * 24 * 60 * 60,
};

export const gbifSendOptions: SendOptions = {
  ...gbifQueueOptions,
  deadLetter: GBIF_IMPORT_DEAD_LETTER_QUEUE,
};

export function calculateRetryDelaySeconds(
  retryCount: number,
  baseSeconds = gbifQueueOptions.retryDelay ?? 5,
  maxSeconds = gbifQueueOptions.retryDelayMax ?? 900,
): number {
  const safeCount = Math.min(Math.max(Math.floor(retryCount), 0), 16);
  return Math.min(maxSeconds, baseSeconds * 2 ** safeCount);
}

export async function prepareGbifQueues(boss: Pick<PgBoss, "createQueue">) {
  await boss.createQueue(GBIF_IMPORT_DEAD_LETTER_QUEUE, {
    retentionSeconds: 30 * 24 * 60 * 60,
    deleteAfterSeconds: 0,
  });
  await boss.createQueue(GBIF_IMPORT_QUEUE, gbifQueueOptions);
}

export async function enqueueGbifImport(
  boss: Pick<PgBoss, "send">,
  job: GbifImportJob,
): Promise<string | null> {
  const normalizedName = job.name.trim().toLowerCase();
  if (!normalizedName) throw new Error("GBIF import name is required");
  return boss.send(GBIF_IMPORT_QUEUE, job, {
    ...gbifSendOptions,
    singletonKey: `gbif:${normalizedName}`,
    singletonSeconds: 60 * 60,
  });
}

export async function startGbifQueueWorker(
  boss: Pick<PgBoss, "work">,
  sql: Parameters<typeof runGbifImportJob>[0],
) {
  return boss.work<GbifImportJob>(GBIF_IMPORT_QUEUE, async ([job]) => {
    if (!job?.data) throw new Error("GBIF queue job has no payload");
    return runGbifImportJob(sql, job.data);
  });
}
