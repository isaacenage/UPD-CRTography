"use client";

import { useEffect, useState } from "react";
import {
  detectPlatform,
  isDismissed,
  isStandalone,
  markDismissed,
  type DeferredPrompt,
  type Platform,
} from "@/lib/pwa/install";

// Branded install chip rendered inside the BottomSheet's empty state.
// On Chrome/Edge/Samsung it captures the beforeinstallprompt event and
// fires the native dialog. On iOS Safari (no programmatic install) it
// shows a Share → Add to Home Screen hint card. Hidden once the user
// dismisses or installs.

export default function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [deferred, setDeferred] = useState<DeferredPrompt | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    if (isDismissed()) return;

    const p = detectPlatform();
    setPlatform(p);
    if (p === "ios-safari") {
      setHidden(false);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as unknown as DeferredPrompt);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installed = () => {
      markDismissed();
      setHidden(true);
    };
    window.addEventListener("appinstalled", installed);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  if (hidden) return null;

  return (
    <div className="mt-4 rounded-sm border border-gold-300 bg-[rgb(245,215,138,0.18)] px-3 py-2.5">
      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className="shrink-0 grid place-items-center w-8 h-8 rounded-sm bg-maroon-500 text-paper text-[11px] font-bold"
        >
          HB
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[10px] tracking-widest uppercase text-maroon-700 font-medium">
            Install on your phone
          </p>
          <p className="mt-1 text-xs text-gray-700 leading-relaxed">
            {platform === "ios-safari" ? (
              <>
                Tap <span className="font-mono font-bold">Share</span> →{" "}
                <span className="font-mono font-bold">Add to Home Screen</span>{" "}
                so the map opens like a native app.
              </>
            ) : (
              <>One-tap install — works offline once installed.</>
            )}
          </p>
          <div className="mt-2 flex gap-2">
            {platform !== "ios-safari" ? (
              <button
                type="button"
                onClick={async () => {
                  if (!deferred) return;
                  try {
                    await deferred.prompt();
                    const choice = await deferred.userChoice;
                    if (choice.outcome === "accepted") {
                      setHidden(true);
                    } else {
                      markDismissed();
                      setHidden(true);
                    }
                  } catch {
                    setHidden(true);
                  }
                }}
                className="rounded-sm bg-maroon-500 hover:bg-maroon-600 text-paper px-3 py-1.5 text-[10px] font-mono tracking-widest uppercase min-h-[36px]"
              >
                Install
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                markDismissed();
                setHidden(true);
              }}
              className="rounded-sm border border-gray-200 bg-paper text-ink px-3 py-1.5 text-[10px] font-mono tracking-widest uppercase hover:bg-paper min-h-[36px]"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
