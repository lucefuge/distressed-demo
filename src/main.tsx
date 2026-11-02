import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  SlidersHorizontal,
  X,
  Plus,
  Check,
  Copy,
  ChevronLeft,
  Heart,
} from "lucide-react";
import {
  catalogRepository,
  emptyFilters,
  filterProducts,
  money,
  orderText,
  normalizeSize,
  priceRangeError,
  type Product,
  type Filters,
} from "./catalog";
import { initializeTelegram } from "./telegram";
import { createClipboardGuard } from "./clipboard";
import { assetUrl } from "./paths";
import "./style.css";
const safeHash = () => {
  try {
    return decodeURIComponent(location.hash.slice(1));
  } catch {
    return "";
  }
};
function ProductImage({
  src,
  alt,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return failed ? (
    <div
      className="image-fallback"
      role="img"
      aria-label={alt || "Фото недоступно"}
    >
      Фото временно недоступно
    </div>
  ) : (
    <img
      {...props}
      src={src ? assetUrl(src, import.meta.env.BASE_URL) : undefined}
      alt={alt}
      onError={() => setFailed(true)}
    />
  );
}
function App() {
  // Public concept uses the channel snapshot; real ordering stays disabled.
  const publicConcept = import.meta.env.PROD;
  const demo =
    !publicConcept && new URLSearchParams(location.search).get("demo") === "1";
  const [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(false),
    [loadAttempt, setLoadAttempt] = useState(0);
  const [items, setItems] = useState<Product[]>([]),
    [f, setF] = useState<Filters>(emptyFilters),
    [sort, setSort] = useState("new"),
    [filtersOpen, setFiltersOpen] = useState(false),
    [active, setActive] = useState(safeHash),
    [size, setSize] = useState(""),
    [copied, setCopied] = useState(false),
    [copyPending, setCopyPending] = useState(false),
    [manual, setManual] = useState(false),
    [favorites, setFavorites] = useState<string[]>([]),
    [onlySaved, setOnlySaved] = useState(false),
    [photo, setPhoto] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const [clipboardGuard] = useState(createClipboardGuard);
  useEffect(() => initializeTelegram(), []);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setLoadError(false);
    catalogRepository
      .list(demo ? "demo" : "channel")
      .then((data) => {
        if (live) setItems(data);
      })
      .catch(() => {
        if (live) setLoadError(true);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [demo, loadAttempt]);
  useEffect(() => {
    const onHash = () => {
      clipboardGuard.invalidate();
      setActive(safeHash());
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [clipboardGuard]);
  const product = items.find((p) => p.id === active);
  useEffect(() => {
    clipboardGuard.invalidate();
    setSize("");
    setCopied(false);
    setManual(false);
    setPhoto(0);
    if (product) {
      dialog.current?.showModal();
      document.body.style.overflow = "hidden";
    } else {
      dialog.current?.close();
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [product, clipboardGuard]);
  const update = (key: keyof Filters, value: string | boolean) =>
    setF((old) => ({ ...old, [key]: value }));
  const close = () => {
    clipboardGuard.invalidate();
    if (history.state?.distressedProduct) history.back();
    else
      history.replaceState(
        null,
        "",
        location.pathname + location.search + "#catalog",
      );
    setActive("");
  };
  const openProduct = (
    event: React.MouseEvent<HTMLAnchorElement>,
    id: string,
  ) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    clipboardGuard.invalidate();
    history.pushState({ distressedProduct: true }, "", "#" + id);
    setActive(id);
  };
  const visible = filterProducts(items, f).filter(
    (p) => !onlySaved || favorites.includes(p.id),
  );
  if (sort === "low") visible.sort((a, b) => a.price - b.price);
  if (sort === "high") visible.sort((a, b) => b.price - a.price);
  const categories = ["Все вещи", ...new Set(items.map((p) => p.category))];
  const brands = [...new Set(items.map((p) => p.brand))],
    sizes = [...new Set(items.flatMap((p) => p.sizes.map(normalizeSize)))];
  const priceError = priceRangeError(f.min, f.max);
  const invalidPrice = Boolean(priceError);
  const count = Object.entries(f).filter(([k, v]) =>
    k === "category" ? v !== "Все вещи" : Boolean(v),
  ).length;
  async function copy() {
    if (!product || copyPending) return;
    setCopyPending(true);
    setCopied(false);
    setManual(false);
    try {
      const result = await clipboardGuard.copy(() =>
        navigator.clipboard.writeText(orderText(product, size)),
      );
      if (result === "copied") setCopied(true);
      if (result === "manual") setManual(true);
    } finally {
      setCopyPending(false);
    }
  }
  return (
    <>
      <div className="announcement">
        <span>Неофициальный демонстрационный концепт</span>
        <a href="https://t.me/fuckdistressed" target="_blank" rel="noreferrer">
          МЫ В TELEGRAM <ArrowUpRight size={12} />
        </a>
      </div>
      <header>
        <a
          className="wordmark"
          href="#"
          onClick={(event) => {
            if (product) {
              event.preventDefault();
              close();
            }
          }}
        >
          <img
            src={assetUrl("/distressed-wordmark.png", import.meta.env.BASE_URL)}
            alt="DISTRESSED"
          />
        </a>
        <nav>
          <a href="#catalog">Каталог</a>
          <a href="#about">О проекте</a>
        </nav>
        <button
          className={"saved " + (onlySaved ? "selected" : "")}
          onClick={() => setOnlySaved(!onlySaved)}
          aria-pressed={onlySaved}
          aria-label={`Избранное: ${favorites.length}`}
        >
          <Heart size={18} /> <span>Избранное</span>{" "}
          <small>{favorites.length}</small>
        </button>
      </header>
      <main>
        <section className="hero">
          <div>
            <div className="eyebrow">
              <span className="dot" /> CURATED CLOTHING / EST. IN TELEGRAM
            </div>
            <h1>
              Характер
              <br />в каждой вещи<span>.</span>
            </h1>
            <p>
              Бренды, которые говорят за себя.
              <br />
              {publicConcept
                ? "Посмотри, каким может быть удобный каталог."
                : "Найди свою вещь — остальное в Telegram."}
            </p>
            <a className="hero-link" href="#catalog">
              СМОТРЕТЬ КАТАЛОГ <ArrowRight size={17} />
            </a>
          </div>
          <div className="hero-image">
            <img
              src={assetUrl("/distressed-logo.png", import.meta.env.BASE_URL)}
              alt="DISTRESSED — фирменное изображение"
            />
          </div>
          <div className="hero-bottom">
            <span>МЕНЬШЕ ШУМА. БОЛЬШЕ СТИЛЯ.</span>
            <span>SCROLL TO EXPLORE ↓</span>
          </div>
        </section>
        <div className="demo-note">
          <span className="demo-pill">{demo ? "ДЕМО-РЕЖИМ" : "ИЗ КАНАЛА"}</span>
          <p>
            {demo
              ? "Все товары, цены и наличие в этом режиме — тестовые. Фотографии иллюстративные. Это не ассортимент продавца."
              : "Последние 15 товарных публикаций на 2 ноября 2026. Цены и размеры — из постов. Актуальное наличие уточняйте у продавца."}
          </p>
          {!publicConcept && (
            <a
              className="mode-switch"
              href={`${import.meta.env.BASE_URL}?demo=${demo ? "0" : "1"}#catalog`}
            >
              {demo ? "Перейти к каналу" : "Проверить демо"}
            </a>
          )}
        </div>
        <section id="catalog" className="catalog">
          <div className="section-title">
            <h2>
              Каталог<span> / {String(items.length).padStart(2, "0")}</span>
            </h2>
            <span>SELECTED, NOT RANDOM.</span>
          </div>
          <div className="category-tabs">
            {categories.map((c) => (
              <button
                key={c}
                className={f.category === c ? "active" : ""}
                aria-pressed={f.category === c}
                onClick={() => update("category", c)}
              >
                {c}
                {c === "Все вещи" && <sup>{items.length}</sup>}
              </button>
            ))}
          </div>
          <div className="toolbar">
            <label className="search">
              <Search size={18} />
              <input
                aria-label="Поиск по названию и артикулу"
                placeholder="Название, бренд или артикул"
                value={f.query}
                onChange={(e) => update("query", e.target.value)}
              />
              {f.query && (
                <button
                  aria-label="Очистить поиск"
                  onClick={() => update("query", "")}
                >
                  <X size={15} />
                </button>
              )}
            </label>
            <button
              className="filter-trigger"
              onClick={() => setFiltersOpen(!filtersOpen)}
              aria-expanded={filtersOpen}
              aria-controls="catalog-filters"
            >
              <SlidersHorizontal size={16} /> Фильтры{" "}
              {count > 0 && <b>{count}</b>}
            </button>
            <select
              aria-label="Сортировка"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="new">По умолчанию</option>
              <option value="low">Сначала дешевле</option>
              <option value="high">Сначала дороже</option>
            </select>
          </div>
          {filtersOpen && (
            <div className="filter-panel" id="catalog-filters">
              <label>
                Бренд
                <select
                  value={f.brand}
                  onChange={(e) => update("brand", e.target.value)}
                >
                  <option value="">Все бренды</option>
                  {brands.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </label>
              <label>
                Размер
                <select
                  value={f.size}
                  onChange={(e) => update("size", e.target.value)}
                >
                  <option value="">Любой размер</option>
                  {sizes.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Цена от, ₽
                <input
                  type="number"
                  min="0"
                  aria-invalid={invalidPrice}
                  aria-describedby={invalidPrice ? "price-error" : undefined}
                  value={f.min}
                  placeholder="0"
                  onChange={(e) => update("min", e.target.value)}
                />
              </label>
              <label>
                Цена до, ₽
                <input
                  type="number"
                  min="0"
                  aria-invalid={invalidPrice}
                  aria-describedby={invalidPrice ? "price-error" : undefined}
                  value={f.max}
                  placeholder="60 000"
                  onChange={(e) => update("max", e.target.value)}
                />
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={f.stock}
                  onChange={(e) => update("stock", e.target.checked)}
                />{" "}
                Только в наличии
              </label>
            </div>
          )}
          {invalidPrice && (
            <p className="filter-error" id="price-error" role="alert">
              {priceError}
            </p>
          )}
          <div className="results" role="status" aria-live="polite">
            <span>
              {onlySaved ? "Избранное · " : ""}Найдено вещей: {visible.length}
            </span>
            {(count > 0 || onlySaved || sort !== "new") && (
              <button
                onClick={() => {
                  setF(emptyFilters);
                  setOnlySaved(false);
                  setSort("new");
                }}
              >
                Сбросить всё <X size={12} />
              </button>
            )}
          </div>
          {loading && (
            <p className="load-state" role="status">
              Загружаем каталог…
            </p>
          )}
          {loadError && (
            <div className="load-state" role="alert">
              <p>Не удалось загрузить каталог.</p>
              <button
                className="black-button"
                onClick={() => setLoadAttempt((n) => n + 1)}
              >
                Повторить
              </button>
            </div>
          )}
          <div className="grid" aria-busy={loading}>
            {!loading &&
              !loadError &&
              visible.map((p, i) => (
                <article className="card" key={p.id}>
                  <div className="product-image">
                    <a
                      href={"#" + p.id}
                      onClick={(event) => openProduct(event, p.id)}
                      aria-label={`${p.brand} ${p.name}`}
                    >
                      <ProductImage
                        src={p.image}
                        alt={p.name}
                        loading={i < 4 ? "eager" : "lazy"}
                      />
                    </a>
                    <span className="badge">
                      {p.demo ? "ДЕМО / " : ""}
                      {p.available === true
                        ? "В НАЛИЧИИ"
                        : p.available === false
                          ? "НЕТ В НАЛИЧИИ"
                          : "НАЛИЧИЕ УТОЧНЯЙТЕ"}
                    </span>
                    <button
                      className="heart"
                      aria-label={
                        favorites.includes(p.id)
                          ? "Удалить из избранного"
                          : "В избранное"
                      }
                      aria-pressed={favorites.includes(p.id)}
                      onClick={() =>
                        setFavorites((old) =>
                          old.includes(p.id)
                            ? old.filter((id) => id !== p.id)
                            : [...old, p.id],
                        )
                      }
                    >
                      <Heart
                        size={18}
                        fill={
                          favorites.includes(p.id) ? "currentColor" : "none"
                        }
                      />
                    </button>
                    <a
                      className="quick"
                      href={"#" + p.id}
                      onClick={(event) => openProduct(event, p.id)}
                    >
                      СМОТРЕТЬ ВЕЩЬ <Plus size={15} />
                    </a>
                  </div>
                  <div className="card-title">
                    <h3>
                      <a
                        href={"#" + p.id}
                        onClick={(event) => openProduct(event, p.id)}
                      >
                        {p.brand}
                      </a>
                    </h3>
                    <span>{money(p.price)}</span>
                  </div>
                  <p>{p.name}</p>
                  <div className="card-meta">
                    <span>{p.sizes.join(" / ")}</span>
                    <span>{p.color}</span>
                  </div>
                </article>
              ))}
          </div>
          {!loading && !loadError && !visible.length && (
            <div className="empty">
              <Search size={32} />
              <h3>Пока ничего не нашлось</h3>
              <p>Попробуйте другой запрос или сбросьте фильтры.</p>
              <button
                className="black-button"
                onClick={() => {
                  setF(emptyFilters);
                  setOnlySaved(false);
                  setSort("new");
                }}
              >
                Показать все вещи
              </button>
            </div>
          )}
        </section>
        <section id="about" className="about">
          <div className="eyebrow">DISTRESSED / ABOUT</div>
          <h2>
            Из Telegram.
            <br />В твой гардероб.
          </h2>
          <div>
            <p>
              {publicConcept
                ? "Неофициальная демонстрация интерфейса каталога. Выбирайте категорию, бренд и размер, открывайте тестовые карточки. Представленные позиции не продаются."
                : "Каталог помогает найти нужную вещь без бесконечного скролла. Выбирай бренд и размер, а детали заказа обсуждай напрямую с продавцом."}
            </p>
            <a
              href="https://t.me/fuckdistressed"
              target="_blank"
              rel="noreferrer"
            >
              ОТКРЫТЬ КАНАЛ <ArrowUpRight size={18} />
            </a>
            <small>
              {demo
                ? "Демо-режим: вымышленные данные для проверки интерфейса."
                : "Данные из публикаций канала. Цена и наличие могут измениться."}
            </small>
          </div>
        </section>
      </main>
      <p className="concept-note">
        Неофициальный демонстрационный концепт. Заказы и платежи недоступны.
        Форм, аналитики и отправки персональных данных нет.
      </p>
      <footer>
        <a className="wordmark" href="#">
          <img
            src={assetUrl("/distressed-wordmark.png", import.meta.env.BASE_URL)}
            alt="DISTRESSED"
          />
        </a>
        <span>INDEPENDENT SELECTION. © {new Date().getFullYear()}</span>
        <a href="https://t.me/fuckdistressed" target="_blank" rel="noreferrer">
          {demo ? "Канал DISTRESSED ↗" : "Источник: Telegram ↗"}
        </a>
      </footer>
      <dialog
        ref={dialog}
        aria-labelledby="product-title"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
      >
        {product && (
          <div className="detail">
            <button
              className="close-detail"
              onClick={close}
              aria-label="Закрыть товар"
            >
              <X />
            </button>
            <div className="detail-gallery">
              <ProductImage
                src={product.images[photo] || product.image}
                alt={product.name}
              />
              <div className="thumbnails">
                {product.images.map((image, n) => (
                  <button
                    key={n}
                    className={photo === n ? "chosen" : ""}
                    onClick={() => setPhoto(n)}
                    aria-label={`Фото ${n + 1}`}
                    aria-pressed={photo === n}
                  >
                    <ProductImage src={image} alt="" />
                  </button>
                ))}
              </div>
              <small>
                {product.demo
                  ? "Демо-фото: иллюстрация тестовой вещи."
                  : "Фотографии из публикации DISTRESSED."}
              </small>
            </div>
            <div className="detail-info">
              <button className="back" onClick={close}>
                <ChevronLeft size={14} /> В каталог
              </button>
              <div className="eyebrow">
                {product.demo ? "ДЕМО / " : "ПОСТ / "}
                {product.id}
              </div>
              <h2>{product.brand}</h2>
              <h3 id="product-title">{product.name}</h3>
              <div className="detail-price">{money(product.price)}</div>
              <p className="availability">
                <span className="dot" />
                {product.available === true
                  ? "В наличии"
                  : product.available === false
                    ? "Нет в наличии"
                    : "Наличие: уточнить у продавца"}
              </p>
              <p className="source-description">{product.description}</p>
              {!product.demo && (
                <a
                  className="source-link"
                  href={product.source}
                  target="_blank"
                  rel="noreferrer"
                >
                  Исходный пост ↗ ·{" "}
                  {new Date(product.publishedAt).toLocaleDateString("ru-RU")}
                </a>
              )}
              <p>
                {product.demo
                  ? "Демонстрационная цена и наличие, товар не продаётся."
                  : "Цена указана в публикации."}{" "}
                Артикул: {product.sku || "не указан"}.
                {!product.demo && " Актуальность уточняйте у продавца."}
              </p>
              <div className="size-label" id="size-label">
                {product.sizes.length
                  ? "ВЫБЕРИТЕ РАЗМЕР"
                  : "РАЗМЕР УТОЧНЯЙТЕ У ПРОДАВЦА"}
              </div>
              <div className="sizes" role="group" aria-labelledby="size-label">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    disabled={product.available === false}
                    className={size === s ? "chosen" : ""}
                    aria-pressed={size === s}
                    onClick={() => {
                      clipboardGuard.invalidate();
                      setSize(s);
                      setCopied(false);
                      setManual(false);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                className="black-button"
                aria-live="polite"
                disabled={
                  copyPending ||
                  (!size && product.sizes.length > 0) ||
                  product.available === false
                }
                onClick={copy}
              >
                {copied ? <Check size={17} /> : <Copy size={17} />}{" "}
                {copyPending
                  ? "Копирование…"
                  : copied
                    ? "Информация скопирована"
                    : "Скопировать информацию"}
              </button>
              {manual && (
                <label className="manual">
                  Скопируйте текст вручную
                  <textarea
                    readOnly
                    value={orderText(product, size)}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                </label>
              )}
              <button className="seller" disabled>
                Заказы недоступны — демонстрационный концепт{" "}
                <ArrowUpRight size={18} />
              </button>
              <small>
                {product.demo
                  ? "Тестовые данные предназначены только для проверки интерфейса."
                  : "Выберите размер, скопируйте информацию и вставьте её в Telegram. Сообщение не отправляется автоматически. Наличие и цену уточняйте у продавца."}
              </small>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
