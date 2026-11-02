# GitHub Pages: distressed-demo

Репозиторий: https://github.com/lucefuge/distressed-demo

Адрес **после успешной публикации**: https://lucefuge.github.io/distressed-demo/

Проект подготовлен локально. Push и публикация требуют отдельного подтверждения владельца. Сайт ещё не размещён.

## Конфигурация

- Vite `base: '/distressed-demo/'`, ресурсы через `assetUrl(..., import.meta.env.BASE_URL)`.
- Hash-маршруты `/distressed-demo/#DEMO-003`: сервер получает только `/distressed-demo/`. Прямые ссылки и reload не требуют rewrite или 404 fallback. URL `/product/123` не используются.
- Production всегда показывает 16 демонстрационных позиций. `?demo=0` не включает реальный ассортимент. Локальный dev-режим сохраняет снимок канала.
- «Неофициальный демонстрационный концепт», заказы и платежи отключены. Ссылок продавца в production bundle нет. Форм отправки, аналитики, cookies, сбора персональных данных и backend нет. Поиск и избранное — в памяти страницы.
- Публичные фото канала — иллюстрации, не изображения вымышленных SKU. Фото и фирменное изображение станут видимы на сайте и в публичном репозитории; права на внешнее размещение подтверждает владелец перед push.
- `.gitignore` исключает `.env*`, приватные ключи, HTML-снимки канала, npm cache, node_modules, dist, логи, PID и скриншоты.

## Проверка

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run preview -- --port 4173 --strictPort
```

Открыть http://127.0.0.1:4173/distressed-demo/. Это статическая production-сборка без зависимости от localhost или локального API; сервер нужен только для локальной проверки файлов.

## Отправка после подтверждения

Репозиторий уже существует и на момент подготовки пуст. Команды из папки проекта:

```sh
git init -b main
git add .
git status --short
git commit -m "Prepare DISTRESSED demonstration for GitHub Pages"
git remote add origin https://github.com/lucefuge/distressed-demo.git
git push -u origin main
```

Если Git уже инициализирован, пропустите `git init`. Если origin уже существует, сначала проверьте `git remote -v`. Не применяйте force-push к чужим изменениям.

На GitHub выберите **Settings → Pages → Build and deployment → Source: GitHub Actions**. Бесплатное размещение рассчитано на публичный репозиторий. Push в main запускает `.github/workflows/deploy.yml`: npm ci, lint, typecheck, тесты, build, загрузка только dist и deployment Pages. Есть ручной workflow_dispatch. Личные PAT, bot tokens и repository secrets не нужны; используются штатные краткоживущие permissions GitHub Actions.

Дождитесь успешных jobs build/deploy в Actions и проверьте адрес Pages с `#DEMO-003` и перезагрузкой. До выполнения workflow публичный адрес может отвечать 404.

Основание: [Vite static deployment](https://vite.dev/guide/static-deploy.html#github-pages), [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
