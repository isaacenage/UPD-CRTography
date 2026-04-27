// Focus trap for the bottom sheet's full-snap state. Keyboard users
// shouldn't tab into the map / chrome behind a fully-expanded sheet.
// Returns a cleanup function. No external dependencies.

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function trapFocus(container: HTMLElement): () => void {
  const previouslyFocused = document.activeElement as HTMLElement | null;

  const focusables = (): HTMLElement[] => {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => !el.hasAttribute("aria-hidden") && el.offsetParent !== null,
    );
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.key !== "Tab") return;
    const list = focusables();
    if (list.length === 0) {
      event.preventDefault();
      container.focus();
      return;
    }
    const first = list[0];
    const last = list[list.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (event.shiftKey) {
      if (active === first || !container.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (active === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  // Move focus into the container.
  const list = focusables();
  if (list.length > 0) {
    list[0].focus();
  } else {
    container.tabIndex = -1;
    container.focus();
  }

  document.addEventListener("keydown", onKey);

  return () => {
    document.removeEventListener("keydown", onKey);
    previouslyFocused?.focus();
  };
}
