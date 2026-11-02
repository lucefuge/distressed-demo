import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  products,
  demoProducts,
  catalogRepository,
  filterProducts,
  emptyFilters,
  orderText,
  normalizeSize,
  priceRangeError,
  type Product,
} from "./catalog.ts";

const ids = (items: Product[]) => items.map((p) => p.id);
const fixture: Product[] = [
  {
    ...products[0],
    id: "a",
    name: "Cotton jacket",
    brand: "Alpha",
    category: "Куртки",
    price: 100,
    sizes: ["М (57см)", "XL"],
    available: true,
    sku: "SKU-A",
  },
  {
    ...products[0],
    id: "b",
    name: "Wool jacket",
    brand: "Alpha",
    category: "Куртки",
    price: 200,
    sizes: ["L"],
    available: false,
    sku: "SKU-B",
  },
  {
    ...products[0],
    id: "c",
    name: "Cotton cap",
    brand: "Beta",
    category: "Кепки",
    price: 300,
    sizes: ["M"],
    available: null,
    sku: null,
  },
];

test("channel snapshot contains 15 unique posts in reverse chronological order with local photos", () => {
  assert.equal(products.length, 15);
  assert.equal(new Set(ids(products)).size, 15);
  products.forEach((p, i) => {
    assert.match(p.source, /^https:\/\/t.me\/fuckdistressed\/\d+$/);
    assert.equal(
      p.available,
      null,
      "publication must not imply confirmed live stock",
    );
    assert.notEqual(p.demo, true);
    assert.ok(p.images.length >= 2);
    p.images.forEach((image) => assert.ok(existsSync("public" + image), image));
    if (i)
      assert.ok(Number(products[i - 1].id.slice(3)) > Number(p.id.slice(3)));
  });
});

test("repository defaults to channel and separates the explicit demo dataset", async () => {
  assert.deepEqual(await catalogRepository.list(), products);
  assert.deepEqual(await catalogRepository.list("channel"), products);
  assert.deepEqual(await catalogRepository.list("demo"), demoProducts);
  assert.ok(demoProducts.length >= 15 && demoProducts.length <= 20);
  assert.equal(new Set(ids(demoProducts)).size, demoProducts.length);
  assert.ok(
    demoProducts.every(
      (p) => p.demo === true && !products.some((real) => real.id === p.id),
    ),
  );
  assert.ok(demoProducts.some((p) => p.available === true));
  assert.ok(demoProducts.some((p) => p.available === false));
  demoProducts.forEach((p) =>
    p.images.forEach((image) => assert.ok(existsSync("public" + image))),
  );
});

test("search trims whitespace and matches name, brand, ID and manufacturer SKU ignoring case", () => {
  for (const query of [" cotton jacket ", "ALPHA", "sku-a", "a"]) {
    assert.ok(
      ids(filterProducts(fixture, { ...emptyFilters, query })).includes("a"),
      query,
    );
  }
  assert.deepEqual(
    ids(filterProducts(products, { ...emptyFilters, query: " ib2961-010 " })),
    ["TG-29661"],
  );
  assert.deepEqual(
    filterProducts(fixture, { ...emptyFilters, query: "not-present-999" }),
    [],
  );
});

test("category, brand and size filters independently restrict the catalog", () => {
  assert.deepEqual(
    ids(filterProducts(fixture, { ...emptyFilters, category: "Кепки" })),
    ["c"],
  );
  assert.deepEqual(
    ids(filterProducts(fixture, { ...emptyFilters, brand: "Alpha" })),
    ["a", "b"],
  );
  assert.deepEqual(
    ids(filterProducts(fixture, { ...emptyFilters, size: "M" })),
    ["a", "c"],
  );
  assert.deepEqual(
    ids(filterProducts(fixture, { ...emptyFilters, size: "XL" })),
    ["a"],
  );
  assert.deepEqual(
    filterProducts(fixture, { ...emptyFilters, size: "XS" }),
    [],
  );
});

test("stock filter includes only explicitly available goods", () => {
  assert.deepEqual(
    ids(filterProducts(fixture, { ...emptyFilters, stock: true })),
    ["a"],
  );
  assert.equal(
    filterProducts(products, { ...emptyFilters, stock: true }).length,
    0,
  );
});

test("price filters include exact bounds and reject empty or reversed ranges", () => {
  assert.deepEqual(
    ids(filterProducts(fixture, { ...emptyFilters, min: "200" })),
    ["b", "c"],
  );
  assert.deepEqual(
    ids(filterProducts(fixture, { ...emptyFilters, max: "200" })),
    ["a", "b"],
  );
  assert.deepEqual(
    ids(filterProducts(fixture, { ...emptyFilters, min: "200", max: "200" })),
    ["b"],
  );
  assert.deepEqual(
    filterProducts(fixture, { ...emptyFilters, min: "300", max: "100" }),
    [],
  );
  assert.deepEqual(
    filterProducts(fixture, { ...emptyFilters, min: "999" }),
    [],
  );
});

test("all filters combine with AND semantics and do not mutate input", () => {
  const before = structuredClone(fixture);
  assert.deepEqual(
    ids(
      filterProducts(fixture, {
        ...emptyFilters,
        query: "cotton",
        category: "Куртки",
        brand: "Alpha",
        size: "M",
        min: "100",
        max: "100",
        stock: true,
      }),
    ),
    ["a"],
  );
  assert.deepEqual(fixture, before);
  assert.deepEqual(filterProducts(fixture, emptyFilters), fixture);
  assert.deepEqual(filterProducts([], emptyFilters), []);
});

test("all sizes from multiline cap publication are preserved", () => {
  assert.deepEqual(products.find((p) => p.id === "TG-29634")?.sizes, [
    "S (55см)",
    "M (57см)",
    "L (59см)",
  ]);
});

test("channel order is multiline and contains real source, selected size and SKU", () => {
  const text = orderText(products[0], "M");
  assert.match(text, /IB2961-010/);
  assert.match(text, /Размер: M/);
  assert.match(text, /https:\/\/t.me\/fuckdistressed\/29661/);
  assert.ok(text.split("\n").length >= 5);
  assert.doesNotMatch(text, /\\n/);
  assert.doesNotMatch(text, /DEMO|Тестовая/);
});

test("demo order explicitly identifies fabricated data", () => {
  assert.match(
    orderText(demoProducts[0], demoProducts[0].sizes[0]),
    /демо|демонстрац|тестов/i,
  );
});

test("invalid numeric price bounds are rejected before filtering", () => {
  for (const value of [
    "NaN",
    "Infinity",
    "-Infinity",
    "-1",
    "-0.01",
    "not-a-price",
    "1e309",
  ]) {
    for (const bound of ["min", "max"] as const) {
      const filters = { ...emptyFilters, [bound]: value };
      assert.ok(priceRangeError(filters.min, filters.max), `${bound}=${value}`);
      assert.deepEqual(
        filterProducts(fixture, filters),
        [],
        `${bound}=${value}`,
      );
    }
  }
});

test("zero price is a real bound while empty and whitespace bounds are absent", () => {
  const free = { ...fixture[0], id: "free", price: 0 };
  const items = [free, ...fixture];
  assert.equal(priceRangeError("0", "0"), null);
  assert.deepEqual(
    ids(filterProducts(items, { ...emptyFilters, min: "0", max: "0" })),
    ["free"],
  );
  assert.deepEqual(ids(filterProducts(items, { ...emptyFilters, max: "0" })), [
    "free",
  ]);
  assert.deepEqual(
    filterProducts(items, { ...emptyFilters, min: "", max: " \t " }),
    items,
  );
  assert.deepEqual(
    filterProducts(items, { ...emptyFilters, min: " 100 ", max: " 200 " }),
    fixture.slice(0, 2),
  );
  assert.equal(priceRangeError(" ", ""), null);
});

test("size normalization handles trimming, lowercase and Cyrillic M consistently", () => {
  for (const value of ["M", "м", " М (57см) ", "m\t(57см)"]) {
    assert.equal(normalizeSize(value), "M", value);
    assert.deepEqual(
      ids(filterProducts(fixture, { ...emptyFilters, size: value })),
      ["a", "c"],
      value,
    );
  }
  assert.equal(normalizeSize("  xl  "), "XL");
  assert.equal(normalizeSize(" 42 EU "), "42");
  assert.equal(normalizeSize(" \t "), "");
  assert.deepEqual(
    filterProducts(fixture, { ...emptyFilters, query: " \t " }),
    fixture,
  );
});

test("repository responses are isolated deeply from source and later requests", async () => {
  for (const mode of ["channel", "demo"] as const) {
    const source = mode === "demo" ? demoProducts : products;
    const snapshot = structuredClone(source);
    const first = await catalogRepository.list(mode);
    const second = await catalogRepository.list(mode);
    assert.notEqual(first, second);
    assert.notEqual(first[0], second[0]);
    assert.notEqual(first[0].images, second[0].images);
    assert.notEqual(first[0].sizes, second[0].sizes);
    first[0].name = "Client-only edit";
    first[0].images.push("/not-a-source-photo.jpg");
    first[0].sizes.splice(0, first[0].sizes.length, "CLIENT-SIZE");
    first.pop();
    assert.deepEqual(source, snapshot);
    assert.deepEqual(second, snapshot);
    assert.deepEqual(await catalogRepository.list(mode), snapshot);
  }
});

test("order for unknown SKU and size does not invent details or include an empty source", () => {
  const item = { ...fixture[0], sizes: [], sku: null, source: "" };
  const text = orderText(item, "");
  assert.match(text, /^Артикул: не указан$/m);
  assert.match(text, /^Размер: уточнить$/m);
  assert.doesNotMatch(text, /^Пост:/m);
  assert.doesNotMatch(text, /undefined|null|\\n/);
  assert.match(text, /Подскажите актуальное наличие и цену\./);
});
