import data from "./products.json" with { type: "json" };

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  sizes: string[];
  available: boolean | null;
  image: string;
  images: string[];
  color: string;
  description: string;
  sku: string | null;
  source: string;
  publishedAt: string;
  demo?: boolean;
};

export type CatalogMode = "channel" | "demo";
export interface CatalogRepository {
  list(mode?: CatalogMode): Promise<Product[]>;
}

export const products: Product[] = data;

// Independent fixtures: never mixed with channel posts or real inventory.
// Local channel photographs illustrate the interface, not these fictional items.
export const demoProducts: Product[] = Array.from(
  { length: 16 },
  (_, index) => {
    const source = products[index % products.length];
    const id = `DEMO-${String(index + 1).padStart(3, "0")}`;
    return {
      ...source,
      id,
      name: `Демо: ${source.category.toLowerCase()} №${index + 1}`,
      brand: index % 2 ? "DEMO STUDIO" : "DEMO LABEL",
      price: 3000 + index * 1500,
      sizes: index % 3 ? ["S", "M", "L"] : ["M", "L", "XL"],
      available: index % 4 === 0 ? false : index % 4 === 1 ? null : true,
      description:
        "ДЕМОНСТРАЦИОННЫЙ ТОВАР. Название, бренд, цена, размеры и наличие вымышлены. Фото из канала используется только как иллюстрация интерфейса и не относится к этой тестовой позиции.",
      sku: id,
      source: "",
      publishedAt: "",
      demo: true,
    };
  },
);

export type Filters = {
  query: string;
  category: string;
  brand: string;
  size: string;
  min: string;
  max: string;
  stock: boolean;
};
export const emptyFilters: Filters = {
  query: "",
  category: "Все вещи",
  brand: "",
  size: "",
  min: "",
  max: "",
  stock: false,
};

export const normalizeSize = (size: string) =>
  size.trim().toUpperCase().replaceAll("М", "M").split(/\s+/)[0];

export function priceRangeError(min: string, max: string): string | null {
  const bounds = [min, max].filter((value) => value.trim() !== "");
  if (
    bounds.some((value) => !Number.isFinite(Number(value)) || Number(value) < 0)
  ) {
    return "Укажите неотрицательную цену.";
  }
  if (min.trim() && max.trim() && Number(min) > Number(max)) {
    return "Цена «от» не должна быть больше цены «до».";
  }
  return null;
}

export function filterProducts(items: Product[], filters: Filters): Product[] {
  const { query, category, brand, size, min, max, stock } = filters;
  if (priceRangeError(min, max)) return [];
  const search = query.trim().toLowerCase();
  return items.filter(
    (product) =>
      (category === "Все вещи" || product.category === category) &&
      (!brand || product.brand === brand) &&
      (!size ||
        product.sizes.some(
          (value) => normalizeSize(value) === normalizeSize(size),
        )) &&
      (!stock || product.available === true) &&
      (!min.trim() || product.price >= Number(min)) &&
      (!max.trim() || product.price <= Number(max)) &&
      `${product.name} ${product.brand} ${product.id} ${product.sku || ""}`
        .toLowerCase()
        .includes(search),
  );
}

// Replace with fetch to a validated server API; secrets must stay server-side.
export const catalogRepository: CatalogRepository = {
  list: async (mode = "channel") =>
    structuredClone(mode === "demo" ? demoProducts : products),
};

export const money = (value: number) =>
  new Intl.NumberFormat("ru-RU").format(value) + " ₽";

export function orderText(product: Product, size: string): string {
  return [
    product.demo
      ? "ДЕМОНСТРАЦИОННЫЙ ТОВАР — не заказ из реального ассортимента."
      : "Здравствуйте!",
    `Интересует ${product.name}`,
    `Артикул: ${product.sku || "не указан"}`,
    `Размер: ${size || "уточнить"}`,
    `${product.demo ? "Тестовая цена" : "Цена в публикации"}: ${money(product.price)}`,
    ...(product.source ? [`Пост: ${product.source}`] : []),
    product.demo
      ? "Все параметры тестовые. Не отправляйте как реальный заказ."
      : "Подскажите актуальное наличие и цену.",
  ].join("\n");
}
