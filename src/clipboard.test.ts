import { test } from "node:test";
import assert from "node:assert/strict";
import { createClipboardGuard } from "./clipboard.ts";

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<void>((success, failure) => {
    resolve = success;
    reject = failure;
  });
  return { promise, resolve, reject };
}

test("clipboard reports success or manual fallback for current selection", async () => {
  const guard = createClipboardGuard();
  assert.equal(await guard.copy(async () => {}), "copied");
  assert.equal(
    await guard.copy(async () => {
      throw Error("denied");
    }),
    "manual",
  );
});

test("selection change invalidates delayed clipboard success", async () => {
  const guard = createClipboardGuard();
  const pending = deferred();
  const result = guard.copy(() => pending.promise);
  guard.invalidate(); // Size M → L, another product, or close dialog.
  pending.resolve();
  assert.equal(await result, "stale");
});

test("selection change invalidates delayed permission rejection", async () => {
  const guard = createClipboardGuard();
  const pending = deferred();
  const result = guard.copy(() => pending.promise);
  guard.invalidate();
  pending.reject(Error("denied"));
  assert.equal(await result, "stale");
});

test("overlapping physical writes are refused until pending request settles", async () => {
  const guard = createClipboardGuard();
  const first = deferred();
  const older = guard.copy(() => first.promise);
  guard.invalidate();
  let newerWriteCalled = false;
  assert.equal(
    await guard.copy(async () => {
      newerWriteCalled = true;
    }),
    "stale",
  );
  assert.equal(newerWriteCalled, false);
  first.resolve();
  assert.equal(await older, "stale");
  assert.equal(
    await guard.copy(async () => {
      newerWriteCalled = true;
    }),
    "copied",
  );
  assert.equal(newerWriteCalled, true);
});
