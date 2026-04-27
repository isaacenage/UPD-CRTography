"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDebouncedValue } from "@/lib/dom/useDebouncedValue";
import { searchBuildings, type SearchHit } from "@/lib/searchBuildings";
import { mapBus } from "@/lib/mapBus";

type Props = {
  features: readonly GeoJSON.Feature[];
  onPick: (hit: SearchHit) => void;
};

export default function SearchBar({ features, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const debounced = useDebouncedValue(query, 180);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const hits = useMemo(() => searchBuildings(features, debounced), [features, debounced]);
  const showResults = focused && query.trim().length > 0;

  // Update --vvh when the on-screen keyboard takes over the bottom of the
  // viewport. Without this the results dropdown sits under the keyboard.
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => {
      document.documentElement.style.setProperty("--vvh", `${vv.height}px`);
    };
    update();
    vv.addEventListener("resize", update);
    return () => vv.removeEventListener("resize", update);
  }, []);

  // Click-away closes results.
  useEffect(() => {
    if (!focused) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [focused]);

  const choose = useCallback(
    (hit: SearchHit) => {
      onPick(hit);
      const id = typeof hit.feature.id === "number" ? hit.feature.id : hit.building.id;
      mapBus.dispatch("flyTo", { featureId: id });
      setQuery("");
      setFocused(false);
      inputRef.current?.blur();
    },
    [onPick],
  );

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="relative">
        <span
          aria-hidden
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          aria-label="Search buildings"
          aria-controls="search-results"
          aria-expanded={showResults}
          placeholder="Search buildings (e.g. LAW, Quezon Hall)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setQuery("");
              setFocused(false);
              inputRef.current?.blur();
            } else if (e.key === "Enter" && hits[0]) {
              choose(hits[0]);
            }
          }}
          className="w-full h-10 rounded-sm bg-paper border border-gray-200 pl-9 pr-9 text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500"
        />
        {query.length > 0 ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-7 h-7 rounded-sm text-gray-500 hover:text-maroon-600 hover:bg-maroon-50"
          >
            ×
          </button>
        ) : null}
      </div>

      {showResults ? (
        <ul
          id="search-results"
          role="listbox"
          className="absolute left-0 right-0 mt-2 bg-paper border border-gray-200 rounded-sm shadow-[0_18px_40px_-16px_rgb(26_26_26_/_0.25)] overflow-y-auto"
          style={{
            maxHeight: "min(calc(var(--vvh, 100dvh) - 220px), 60vh)",
          }}
        >
          {hits.length === 0 ? (
            <li className="px-3 py-4 text-xs text-gray-500">
              No matches. Try the acronym (e.g. <span className="font-mono">CMC</span>,{" "}
              <span className="font-mono">LAW</span>).
            </li>
          ) : (
            hits.map((hit) => (
              <li key={hit.building.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => choose(hit)}
                  className="w-full text-left px-3 py-2.5 hover:bg-maroon-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                >
                  <span className="shrink-0 font-mono text-[10px] tracking-widest uppercase text-maroon-600 bg-maroon-50 border border-maroon-100 rounded-sm px-1.5 py-0.5">
                    {hit.building.acronym || "—"}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-ink truncate">
                      {hit.building.name}
                    </span>
                    <span className="block font-mono text-[9px] tracking-widest uppercase text-gray-500">
                      {hit.building.hasBidet === "yes" ? "May Bidet" : hit.building.hasBidet === "no" ? "Walang Bidet" : "Unverified"}
                      {" · "}
                      {hit.building.access === "public" ? "Public" : "Students & Staff"}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
