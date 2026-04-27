"use client";

import { useState } from "react";

export default function InfoPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-auto">
      {open ? (
        <div className="bg-paper/95 backdrop-blur-sm border border-gray-200 rounded-sm shadow-[0_10px_40px_-16px_rgb(26_26_26_/_0.35)] w-[320px] max-w-[calc(100vw-2rem)]">
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-200">
            <span className="font-mono text-[10px] tracking-widest uppercase text-maroon-600 font-medium">
              About this map
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-500 hover:text-maroon-500 transition-colors text-lg leading-none w-6 h-6 flex items-center justify-center"
              aria-label="Close info panel"
            >
              &times;
            </button>
          </div>
          <div className="px-4 py-3 text-sm font-light text-gray-700 leading-relaxed space-y-3">
            <p>
              A guide to comfort room locations across the UP Diliman campus,
              highlighting <span className="font-medium text-ink">bidet availability</span>,
              gender-specific and all-gender access, and accessibility.
            </p>
            <p>
              The goal is to help students, staff, and visitors easily find
              comfortable, inclusive, and accessible facilities throughout campus.
              Access to safe and sanitary restrooms supports public health,
              comfort, and dignity in a large, active campus like UP Diliman.
            </p>
            <p className="text-xs text-gray-500">
              Primary data source:{" "}
              <a
                href="https://www.facebook.com/share/p/1HwxPg9ETt/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-maroon-500 hover:text-maroon-600 underline underline-offset-2"
              >
                Philippine Collegian
              </a>
              .
            </p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="bg-paper/90 backdrop-blur-sm border border-gray-200 rounded-sm w-10 h-10 flex items-center justify-center text-ink font-bold text-base hover:bg-maroon-50 hover:border-maroon-300 transition-colors shadow-[0_6px_24px_-12px_rgb(26_26_26_/_0.25)]"
          aria-label="Open info panel"
        >
          i
        </button>
      )}
    </div>
  );
}
