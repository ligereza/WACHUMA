import assert from "node:assert/strict";
import test from "node:test";

const {
  calculateRetryDelaySeconds,
  enqueueGbifImport,
  gbifQueueOptions,
  GBIF_IMPORT_QUEUE,
} = await import("../dist/queue.js");

test("retry policy is bounded and exponential", () => {
  assert.equal(calculateRetryDelaySeconds(0), 5);
  assert.equal(calculateRetryDelaySeconds(1), 10);
  assert.equal(calculateRetryDelaySeconds(10), 900);
  assert.equal(calculateRetryDelaySeconds(-5), 5);
  assert.equal(gbifQueueOptions.retryLimit, 5);
  assert.equal(gbifQueueOptions.retryBackoff, true);
});

test("enqueue uses a normalized singleton key for idempotency", async () => {
  const calls = [];
  const boss = {
    async send(...args) {
      calls.push(args);
      return "job-1";
    },
  };
  const id = await enqueueGbifImport(boss, {
    name: " Echinopsis pachanoi ",
    occurrenceLimit: 20,
  });
  assert.equal(id, "job-1");
  assert.equal(calls[0][0], GBIF_IMPORT_QUEUE);
  assert.deepEqual(calls[0][1], {
    name: " Echinopsis pachanoi ",
    occurrenceLimit: 20,
  });
  assert.equal(calls[0][2].singletonKey, "gbif:echinopsis pachanoi");
});

test("enqueue rejects blank names before touching the queue", async () => {
  let called = false;
  await assert.rejects(
    enqueueGbifImport(
      { send: async () => ((called = true), "never") },
      { name: "   " },
    ),
    /required/,
  );
  assert.equal(called, false);
});
