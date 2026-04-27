"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { log } from "@/lib/log";

type State = { error: Error | null };

// Class component is still required for componentDidCatch in React 19.
// Wraps the dynamically-imported Map so a runtime error in MapLibre
// doesn't take down the whole app.
export default class MapErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    log.error("map", error.message, { stack: error.stack, componentStack: info.componentStack });
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="absolute inset-0 grid place-items-center bg-paper px-6 text-center"
        >
          <div className="max-w-sm">
            <div className="font-mono text-[10px] tracking-widest uppercase text-maroon-600 font-medium">
              Map error
            </div>
            <h2 className="mt-1 text-base font-bold text-ink">
              The map failed to load.
            </h2>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              Try reloading the page. If the problem persists you may be
              behind a network that blocks the basemap or routing servers.
            </p>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.location.reload();
              }}
              className="mt-4 rounded-sm bg-maroon-500 hover:bg-maroon-600 text-paper px-4 py-2 text-xs font-mono tracking-widest uppercase min-h-[44px]"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
