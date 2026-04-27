"use client";

import { useEffect, useState } from "react";

type UpdateState = "idle" | "available" | "reloading";

export default function SwRegister() {
  const [updateState, setUpdateState] = useState<UpdateState>("idle");
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    const onControllerChange = () => {
      if (updateState === "reloading") return;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        if (cancelled) return;

        const trackWaiting = (worker: ServiceWorker | null) => {
          if (!worker) return;
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(worker);
            setUpdateState("available");
          }
        };

        trackWaiting(registration.waiting);

        registration.addEventListener("updatefound", () => {
          const incoming = registration.installing;
          if (!incoming) return;
          incoming.addEventListener("statechange", () => trackWaiting(incoming));
        });
      })
      .catch(() => {
        // SW registration is best-effort; failure should not break the app.
      });

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, [updateState]);

  if (updateState !== "available" || !waitingWorker) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 z-50 bg-ink text-paper rounded-sm px-4 py-3 shadow-[0_10px_40px_-12px_rgb(26_26_26_/_0.45)] flex items-center gap-3 font-sans text-sm"
      style={{ bottom: "max(var(--safe-bottom), 1rem)" }}
    >
      <span>New version available</span>
      <button
        type="button"
        onClick={() => {
          setUpdateState("reloading");
          waitingWorker.postMessage({ type: "SKIP_WAITING" });
        }}
        className="font-mono text-[11px] tracking-widest uppercase bg-paper text-ink px-3 py-1.5 rounded-sm hover:bg-gold-300 transition-colors"
      >
        Reload
      </button>
    </div>
  );
}
