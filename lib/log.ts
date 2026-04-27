// Tiny logging shim. Replaces direct `console.error` / `console.warn`
// calls with a mapBus dispatch so a future Sentry / DevConsole tap can
// observe errors without us littering the codebase. In production, errors
// are silently dropped after dispatch.

import { mapBus } from "@/lib/mapBus";

export type LogSource = "map" | "directions" | "sw" | "search" | "shell";

function emit(source: LogSource, message: string, err?: unknown): void {
  try {
    mapBus.dispatch("error", { source, message });
  } catch {
    // Bus dispatch should never throw, but be defensive.
  }
  if (process.env.NODE_ENV !== "production") {
    // Dev-only echo so the developer still sees it in the console while
    // working locally. Production stays silent.
    // eslint-disable-next-line no-console
    console.error(`[${source}] ${message}`, err ?? "");
  }
}

export const log = {
  error(source: LogSource, message: string, err?: unknown): void {
    emit(source, message, err);
  },
};
