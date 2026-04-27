"use client";

import { useEffect, useState } from "react";

// SSR-safe media-query hook. Returns `false` on first render so server
// markup never branches on viewport size; client hydration applies the
// real value in a layout effect-equivalent pass.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mql = window.matchMedia(query);
    const apply = () => setMatches(mql.matches);
    apply();

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }
    // Safari < 14 fallback
    mql.addListener(apply);
    return () => mql.removeListener(apply);
  }, [query]);

  return matches;
}

export const MQ_DESKTOP = "(min-width: 768px)";
