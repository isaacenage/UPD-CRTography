// Safe-area helpers for iOS notch / Dynamic Island / home indicator and
// Android status / gesture bar. Pair with `viewportFit: "cover"` in app/layout
// — without that, env(safe-area-inset-*) returns 0 on iPhone.

import type { CSSProperties } from "react";

export const SAFE_TOP_VAR = "var(--safe-top)";
export const SAFE_BOTTOM_VAR = "var(--safe-bottom)";
export const SAFE_LEFT_VAR = "var(--safe-left)";
export const SAFE_RIGHT_VAR = "var(--safe-right)";

export function safeTopStyle(extra: string = "0px"): CSSProperties {
  return { paddingTop: `calc(${SAFE_TOP_VAR} + ${extra})` };
}

export function safeBottomStyle(extra: string = "1rem"): CSSProperties {
  return { paddingBottom: `max(${SAFE_BOTTOM_VAR}, ${extra})` };
}

export function safeInsetStyle(extra: string = "0px"): CSSProperties {
  return {
    paddingTop: `calc(${SAFE_TOP_VAR} + ${extra})`,
    paddingBottom: `calc(${SAFE_BOTTOM_VAR} + ${extra})`,
    paddingLeft: `calc(${SAFE_LEFT_VAR} + ${extra})`,
    paddingRight: `calc(${SAFE_RIGHT_VAR} + ${extra})`,
  };
}
