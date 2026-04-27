"use client";

import {
  DEFAULT_FILTERS,
  isAllOff,
  setHasBidet,
  setPublicOnly,
  type Filters,
} from "@/lib/filters";

type Props = {
  filters: Filters;
  onChange: (next: Filters) => void;
};

type Chip = {
  key: string;
  label: string;
  active: boolean;
  onTap: () => void;
};

export default function FilterChips({ filters, onChange }: Props) {
  const chips: Chip[] = [
    {
      key: "all",
      label: "All",
      active: isAllOff(filters),
      onTap: () => onChange(DEFAULT_FILTERS),
    },
    {
      key: "public",
      label: "Public only",
      active: filters.publicOnly,
      onTap: () => onChange(setPublicOnly(filters, !filters.publicOnly)),
    },
    {
      key: "has-bidet",
      label: "Has bidet",
      active: filters.hasBidet === "yes",
      onTap: () =>
        onChange(setHasBidet(filters, filters.hasBidet === "yes" ? "all" : "yes")),
    },
    {
      key: "no-bidet",
      label: "No bidet",
      active: filters.hasBidet === "no",
      onTap: () =>
        onChange(setHasBidet(filters, filters.hasBidet === "no" ? "all" : "no")),
    },
  ];

  return (
    <div role="tablist" aria-label="Building filters" className="flex items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          role="tab"
          aria-pressed={chip.active}
          onClick={chip.onTap}
          className={[
            "snap-start scroll-mx-3 shrink-0",
            "rounded-full border px-3.5 py-2 min-h-[36px]",
            "font-mono text-[10px] tracking-widest uppercase font-medium",
            "transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
            chip.active
              ? "bg-forest-500 text-white border-forest-600 hover:bg-forest-600 focus:ring-forest-500"
              : "bg-paper text-ink border-gray-200 hover:border-maroon-300 hover:bg-maroon-50 focus:ring-maroon-500",
          ].join(" ")}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
