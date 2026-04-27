"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "hb:loc-explained";

type Props = {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

// Soft pre-prompt explaining why we want geolocation. Shown once per
// browser (localStorage flag). The native browser prompt fires only after
// the user taps Continue, so denials in the native dialog still leave the
// soft-prompt flag set — they won't see this twice.
export default function PermissionExplainer({ open, onAccept, onDecline }: Props) {
  const [seen, setSeen] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSeen(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  if (!open || seen) return null;

  const dismiss = (accept: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Private mode / Safari: explainer reappears next session — acceptable.
    }
    setSeen(true);
    if (accept) onAccept();
    else onDecline();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="loc-explain-title"
      className="fixed inset-0 z-[60] grid place-items-end sm:place-items-center bg-ink/40 backdrop-blur-[1px] px-4"
      style={{ paddingBottom: "max(var(--safe-bottom), 1rem)" }}
    >
      <div className="w-full max-w-sm bg-paper border border-gray-200 rounded-sm shadow-[0_18px_40px_-12px_rgb(26_26_26_/_0.45)] overflow-hidden">
        <div className="bg-forest-500 text-paper px-5 py-3">
          <div className="font-mono text-[9px] tracking-[0.2em] uppercase opacity-85 font-medium">
            Permission &middot; Location
          </div>
          <h3 id="loc-explain-title" className="mt-1 text-base font-bold leading-tight">
            Use your location for walking directions?
          </h3>
        </div>
        <div className="px-5 py-4 text-sm text-gray-700 leading-relaxed space-y-2">
          <p>
            We use your phone's location to draw a walking route from where
            you stand to the comfort room you tapped. Your location stays on
            your device — we don't store or share it.
          </p>
          <p className="text-xs text-gray-500">
            You'll see a system prompt next where you can allow or deny.
          </p>
        </div>
        <div className="px-5 pb-4 flex gap-2">
          <button
            type="button"
            onClick={() => dismiss(false)}
            className="flex-1 rounded-sm border border-gray-200 bg-paper text-ink py-2.5 text-xs font-mono tracking-widest uppercase hover:bg-maroon-50 hover:border-maroon-300 min-h-[44px]"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={() => dismiss(true)}
            className="flex-1 rounded-sm bg-forest-500 hover:bg-forest-600 text-paper py-2.5 text-xs font-mono tracking-widest uppercase min-h-[44px]"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper for callers that want to know whether the soft prompt has been
// shown already without rendering the dialog.
export function hasShownLocationExplainer(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}
