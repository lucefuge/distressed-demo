/** Optional Telegram WebApp bridge. The host may load the official SDK before
 * main.tsx for a future Mini App. initData must be verified only on a server.
 */
export interface TelegramWebApp {
  ready?: () => void;
  expand?: () => void;
  openTelegramLink?: (url: string) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export const SELLER_URL = "https://t.me/distressedone";

export function initializeTelegram(): () => void {
  if (typeof window === "undefined") return () => {};
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return () => {};
  try {
    webApp.ready?.();
    webApp.expand?.();
    document.documentElement.dataset.telegram = "true";
  } catch {
    // An incomplete bridge must not prevent browsing the catalog.
  }
  return () => {
    delete document.documentElement.dataset.telegram;
  };
}

export function openSeller(): void {
  if (typeof window === "undefined") return;
  try {
    const webApp = window.Telegram?.WebApp;
    if (webApp?.openTelegramLink) {
      webApp.openTelegramLink(SELLER_URL);
      return;
    }
  } catch {
    // Fall back to the regular URL if a host SDK is incomplete.
  }
  window.open(SELLER_URL, "_blank", "noopener,noreferrer");
}
