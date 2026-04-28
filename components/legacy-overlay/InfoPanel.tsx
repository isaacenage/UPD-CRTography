"use client";

type Props = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
};

// Trigger button only. The "About this map" content lives in
// <InfoPanelModal />, rendered once at the page root so opening it
// blocks the whole screen instead of expanding from this button. Two
// copies of this trigger are mounted (mobile FAB + desktop sidebar);
// both flip the same `aboutOpen` flag.
export default function InfoPanel({ open, onOpenChange }: Props) {
  return (
    <div className="pointer-events-auto">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="bg-paper/90 backdrop-blur-sm border border-gray-200 rounded-sm w-10 h-10 flex items-center justify-center text-ink font-bold text-base hover:bg-maroon-50 hover:border-maroon-300 transition-colors shadow-[0_6px_24px_-12px_rgb(26_26_26_/_0.25)]"
        aria-label={open ? "Close info panel" : "Open info panel"}
        aria-expanded={open}
      >
        i
      </button>
    </div>
  );
}
