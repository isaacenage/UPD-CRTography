"use client";

type Props = { onClick: () => void };

// Mirrors LocateFab on the opposite edge so the contribute affordance
// stays in the user's peripheral vision while they pan / zoom looking
// for missing buildings. Aligned vertically with LocateFab — same bottom
// inset — so the two FABs read as a paired "left = add, right = locate"
// pattern.
export default function ContributeFab({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Contribute a new building with a bidet"
      className="absolute z-20 left-3 grid place-items-center w-14 h-14 rounded-full bg-paper border border-gray-200 text-forest-500 dark:text-forest-300 shadow-[0_10px_28px_-12px_rgb(26_26_26_/_0.35)] hover:bg-forest-50 hover:border-forest-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forest-500 transition-colors"
      style={{
        bottom: "calc(var(--safe-bottom) + var(--sheet-peek, 120px) + 12px)",
        left: "max(var(--safe-left), 0.75rem)",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
        aria-hidden
      >
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    </button>
  );
}
