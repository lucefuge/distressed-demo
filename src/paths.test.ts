import { test } from "node:test";
import assert from "node:assert/strict";
import { assetUrl } from "./paths.ts";

const base = "/distressed-demo/";

test("Pages base prefixes public product photos and logos", () => {
  assert.equal(
    assetUrl("/products/29661-0.jpg", base),
    "/distressed-demo/products/29661-0.jpg",
  );
  assert.equal(
    assetUrl("/distressed-wordmark.png", base),
    "/distressed-demo/distressed-wordmark.png",
  );
  assert.equal(
    assetUrl("/distressed-logo.png", base),
    "/distressed-demo/distressed-logo.png",
  );
});

test("already-prefixed assets remain stable on repeated resolution", () => {
  const path = "/distressed-demo/products/29661-0.jpg";
  assert.equal(assetUrl(path, base), path);
  assert.equal(assetUrl(assetUrl(path, base), base), path);
  assert.equal(assetUrl("distressed-demo/products/29661-0.jpg", base), path);
  assert.equal(
    assetUrl("/distressed-demo-other/logo.png", base),
    "/distressed-demo/distressed-demo-other/logo.png",
  );
});

test("relative public paths use the same deployment base", () => {
  assert.equal(
    assetUrl("products/photo.jpg", base),
    "/distressed-demo/products/photo.jpg",
  );
  assert.equal(
    assetUrl("./products/photo.jpg", base),
    "/distressed-demo/products/photo.jpg",
  );
  assert.equal(
    assetUrl("./distressed-wordmark.png", base),
    "/distressed-demo/distressed-wordmark.png",
  );
});

test("external and inline URLs are preserved verbatim", () => {
  for (const path of [
    "https://cdn.example.com/photo.jpg?width=400#preview",
    "http://localhost/photo.jpg",
    "//cdn.example.com/photo.jpg",
    "data:image/png;base64,ABC123",
    "blob:https://example.com/id",
  ]) {
    assert.equal(assetUrl(path, base), path);
  }
});

test("root deployments and base slash variants do not create duplicate slashes", () => {
  assert.equal(assetUrl("/products/photo.jpg", "/"), "/products/photo.jpg");
  assert.equal(assetUrl("products/photo.jpg", ""), "/products/photo.jpg");
  assert.equal(
    assetUrl("/logo.png", "distressed-demo"),
    "/distressed-demo/logo.png",
  );
  assert.equal(
    assetUrl("/logo.png", "/distressed-demo"),
    "/distressed-demo/logo.png",
  );
  assert.equal(
    assetUrl("/logo.png", "//distressed-demo//"),
    "/distressed-demo/logo.png",
  );
});

test("asset query strings and fragments survive prefixing", () => {
  assert.equal(
    assetUrl("/logo.png?v=2#mark", base),
    "/distressed-demo/logo.png?v=2#mark",
  );
  assert.equal(assetUrl("", base), "");
  assert.equal(assetUrl("#catalog", base), "#catalog");
  assert.equal(assetUrl("?demo=1", base), "?demo=1");
});
