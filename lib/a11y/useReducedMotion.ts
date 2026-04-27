"use client";

import { useMediaQuery } from "@/lib/dom/useMediaQuery";

export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
