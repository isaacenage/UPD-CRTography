"use client";

import { useEffect } from "react";
import Link from "next/link";

type Props = {
  open: boolean;
  onClose: () => void;
};

// Full-screen "About this map" overlay. Translucent backdrop (white in
// light mode, black in dark mode) with floating text — no cards, no
// borders, just typography on a blurred surface. An X button in the
// top-right and Esc both close it. Clicking the backdrop also closes,
// since there's no other interactive surface beneath the text.
export default function InfoPanelModal({ open, onClose }: Props) {
  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while the modal is up so the page can't move
  // beneath the floating text on iOS.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-this-map-title"
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-white/85 dark:bg-black/85 backdrop-blur-md text-black dark:text-white animate-[fadeIn_140ms_ease-out]"
      style={{
        paddingTop: "max(var(--safe-top), 0px)",
        paddingBottom: "max(var(--safe-bottom), 0px)",
        paddingLeft: "max(var(--safe-left), 0px)",
        paddingRight: "max(var(--safe-right), 0px)",
      }}
    >
      {/* Close button — fixed to the modal corner, not part of the
          content flow, so it doesn't crowd the typography. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
        className="absolute top-4 right-4 w-11 h-11 grid place-items-center text-black dark:text-white hover:opacity-70 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-current rounded-sm"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-7 h-7"
          aria-hidden
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>

      {/* Stop click bubbling on the text column so highlighting copy
          doesn't accidentally dismiss the modal. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full overflow-y-auto px-6 py-12 sm:py-16 grid place-items-center"
      >
        <div className="w-full max-w-xl mx-auto space-y-6 leading-relaxed">
          <div
            id="about-this-map-title"
            className="font-mono text-[10px] tracking-[0.25em] uppercase opacity-70"
          >
            About this map
          </div>

          <p className="text-lg sm:text-xl font-light">
            A guide to comfort room locations across the UP Diliman campus,
            highlighting <span className="font-medium">bidet availability</span>,
            gender-specific and all-gender access, and accessibility.
          </p>

          <p className="text-base sm:text-lg font-light opacity-90">
            The goal is to help students, staff, and visitors easily find
            comfortable, inclusive, and accessible facilities throughout campus.
            Access to safe and sanitary restrooms supports public health,
            comfort, and dignity in a large, active campus like UP Diliman.
          </p>

          <p className="text-sm sm:text-base font-light opacity-70">
            Primary data source:{" "}
            <a
              href="https://www.facebook.com/share/p/1HwxPg9ETt/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:opacity-80"
            >
              Philippine Collegian
            </a>
            .
          </p>

          <div className="flex gap-6 pt-2 font-mono text-[11px] tracking-[0.2em] uppercase opacity-80">
            <Link
              href="/terms"
              className="underline underline-offset-4 hover:opacity-70"
              onClick={onClose}
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="underline underline-offset-4 hover:opacity-70"
              onClick={onClose}
            >
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
