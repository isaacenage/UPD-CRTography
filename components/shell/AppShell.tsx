"use client";

import type { ReactNode } from "react";
import TopBar from "./TopBar";
import ChipRow from "./ChipRow";
import LocateFab from "./LocateFab";
import HomeFab from "./HomeFab";
import { useMediaQuery, MQ_DESKTOP } from "@/lib/dom/useMediaQuery";

type Props = {
  // The map fills the middle band; passed in to keep the shell agnostic
  // about which map component (and which props) is mounted.
  map: ReactNode;
  // Phase 3 fills with <SearchBar />; placeholder shown otherwise.
  searchSlot?: ReactNode;
  // Phase 1 wraps the existing toggle; Phase 3 swaps in <FilterChips />.
  chipSlot: ReactNode;
  // Phase 2+ renders <BottomSheet />; Phase 1 shows a peek-only placeholder.
  bottomSheet: ReactNode;
  // Floating "i" affordance — rendered above the map and beneath the
  // bottom sheet so About stays reachable when the sheet's body is showing
  // a building detail or directions. On desktop, the same panel renders
  // inside `desktopSidebar` (so this slot is only painted on mobile).
  infoPanel?: ReactNode;
  // Desktop ≥md only — original overlay cards (TitleCard / InfoPanel /
  // Legend) rendered in a sidebar so power users keep the dense view.
  desktopSidebar?: ReactNode;
};

export default function AppShell({
  map,
  searchSlot,
  chipSlot,
  bottomSheet,
  infoPanel,
  desktopSidebar,
}: Props) {
  const isDesktop = useMediaQuery(MQ_DESKTOP);

  return (
    <main
      className="map-ui-chrome fixed inset-0 flex flex-col overflow-hidden"
      style={{ height: "100dvh" }}
    >
      <TopBar searchSlot={searchSlot} />
      <ChipRow>{chipSlot}</ChipRow>

      {/* Map fills remaining vertical space. min-h-0 is required or the
          flex child collapses on Firefox. */}
      <div className="relative flex-1 min-h-0">
        {map}
        {!isDesktop && infoPanel ? (
          <div
            className="absolute top-3 left-3 z-20 pointer-events-none"
            style={{ paddingLeft: "max(var(--safe-left), 0px)" }}
          >
            {infoPanel}
          </div>
        ) : null}
        <HomeFab />
        <LocateFab />
        {isDesktop && desktopSidebar ? (
          <aside
            className="hidden md:flex absolute top-3 left-3 flex-col gap-3 max-w-[360px] z-10 pointer-events-none"
            style={{ paddingLeft: "max(var(--safe-left), 0px)" }}
          >
            {desktopSidebar}
          </aside>
        ) : null}
      </div>

      {bottomSheet}
    </main>
  );
}
