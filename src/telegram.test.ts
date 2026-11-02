import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initializeTelegram,
  openSeller,
  SELLER_URL,
  type TelegramWebApp,
} from "./telegram.ts";

function withBrowser(
  webApp: TelegramWebApp | undefined,
  run: (calls: unknown[][], dataset: Record<string, string>) => void,
) {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalDocument = Object.getOwnPropertyDescriptor(
    globalThis,
    "document",
  );
  const calls: unknown[][] = [];
  const dataset: Record<string, string> = {};
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      Telegram: webApp ? { WebApp: webApp } : undefined,
      open: (...args: unknown[]) => calls.push(args),
    },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { documentElement: { dataset } },
  });
  try {
    run(calls, dataset);
  } finally {
    if (originalWindow)
      Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (originalDocument)
      Object.defineProperty(globalThis, "document", originalDocument);
    else Reflect.deleteProperty(globalThis, "document");
  }
}

test("server/no-browser environment can initialize and open without errors", () => {
  assert.equal(typeof window, "undefined");
  assert.doesNotThrow(() => initializeTelegram()());
  assert.doesNotThrow(() => openSeller());
});

test("ordinary browser initializes without SDK and opens only fixed seller URL", () => {
  withBrowser(undefined, (calls, dataset) => {
    initializeTelegram()();
    assert.deepEqual(dataset, {});
    openSeller();
    assert.deepEqual(calls, [[SELLER_URL, "_blank", "noopener,noreferrer"]]);
  });
});

test("Mini App bridge receives ready, expand, fixed link and cleanup", () => {
  const bridgeCalls: string[] = [];
  withBrowser(
    {
      ready: () => bridgeCalls.push("ready"),
      expand: () => bridgeCalls.push("expand"),
      openTelegramLink: (url) => bridgeCalls.push(url),
    },
    (calls, dataset) => {
      const cleanup = initializeTelegram();
      assert.deepEqual(bridgeCalls, ["ready", "expand"]);
      assert.equal(dataset.telegram, "true");
      openSeller();
      assert.deepEqual(bridgeCalls, ["ready", "expand", SELLER_URL]);
      assert.equal(calls.length, 0);
      cleanup();
      assert.equal(dataset.telegram, undefined);
    },
  );
});

test("throwing SDK initialization does not break catalog, link falls back safely", () => {
  withBrowser(
    {
      ready: () => {
        throw Error("host unavailable");
      },
      openTelegramLink: () => {
        throw Error("host unavailable");
      },
    },
    (calls, dataset) => {
      assert.doesNotThrow(() => initializeTelegram()());
      assert.deepEqual(dataset, {});
      openSeller();
      assert.deepEqual(calls, [[SELLER_URL, "_blank", "noopener,noreferrer"]]);
    },
  );
});
