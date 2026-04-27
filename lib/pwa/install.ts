// Install-prompt plumbing for PWAs. Pure helpers — JSX in
// components/pwa/InstallPrompt.tsx imports these.

const DISMISS_KEY = "hb:install-dismissed-at";
const DISMISS_TTL_DAYS = 30;

export type DeferredPrompt = Readonly<{
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
}>;

export type Platform = "android-chrome" | "ios-safari" | "ios-pwa" | "desktop" | "unknown";

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  const isIos = /iPad|iPhone|iPod/.test(ua);
  if (isIos) {
    const standalone =
      "standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return standalone ? "ios-pwa" : "ios-safari";
  }
  const isAndroid = /Android/i.test(ua);
  if (isAndroid) return "android-chrome";
  return "desktop";
}

export function isDismissed(now: number = Date.now()): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    const ts = Number.parseInt(v, 10);
    if (!Number.isFinite(ts)) return false;
    const ageDays = (now - ts) / (1000 * 60 * 60 * 24);
    return ageDays < DISMISS_TTL_DAYS;
  } catch {
    return true;
  }
}

export function markDismissed(now: number = Date.now()): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISS_KEY, String(now));
  } catch {
    // Private mode — accept that the prompt may reappear next session.
  }
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
  return false;
}
