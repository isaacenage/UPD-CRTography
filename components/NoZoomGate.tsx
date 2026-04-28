"use client";

import { useEffect } from "react";

// iOS Safari ignores `<meta name="viewport" user-scalable=no>` for
// accessibility reasons, and `touch-action: pan-x pan-y` alone is not
// always sufficient to suppress the page-level pinch zoom that fires
// over fixed UI surfaces (the top bar, the bottom sheet, MapLibre's
// control buttons). The only reliable kill-switch on iOS is to
// preventDefault on Safari's proprietary `gesturestart` events and to
// swallow ctrl+wheel (trackpad pinch on Safari/Chrome desktop).
//
// MapLibre handles pinch-to-zoom on its canvas via raw touch events, so
// these listeners do not interfere with map pinch-zoom — that gesture
// fires on the map canvas, which has `touch-action: none` and consumes
// touchmove events directly.

const ALLOW_ZOOM_SELECTOR = ".maplibregl-canvas-container";

function isInsideMapCanvas(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest(ALLOW_ZOOM_SELECTOR) !== null;
}

export default function NoZoomGate() {
  useEffect(() => {
    const stop = (event: Event) => {
      if (isInsideMapCanvas(event.target)) return;
      event.preventDefault();
    };

    const stopWheel = (event: WheelEvent) => {
      // ctrlKey + wheel === trackpad pinch on macOS Safari/Chrome and
      // Ctrl + scroll on desktop browsers (both trigger page zoom).
      if (!event.ctrlKey) return;
      if (isInsideMapCanvas(event.target)) return;
      event.preventDefault();
    };

    // iOS Safari proprietary gesture events. Listening on document with
    // capture: true lets us intercept before any inner element handles them.
    const opts: AddEventListenerOptions = { passive: false, capture: true };
    document.addEventListener("gesturestart", stop, opts);
    document.addEventListener("gesturechange", stop, opts);
    document.addEventListener("gestureend", stop, opts);

    // Kill iOS double-tap-zoom on UI. CSS `touch-action: manipulation`
    // covers most cases but Safari occasionally still fires it on fixed
    // chrome — preventing dblclick is a reliable backstop.
    document.addEventListener("dblclick", stop, opts);

    document.addEventListener("wheel", stopWheel, opts);

    return () => {
      document.removeEventListener("gesturestart", stop, opts);
      document.removeEventListener("gesturechange", stop, opts);
      document.removeEventListener("gestureend", stop, opts);
      document.removeEventListener("dblclick", stop, opts);
      document.removeEventListener("wheel", stopWheel, opts);
    };
  }, []);

  return null;
}
