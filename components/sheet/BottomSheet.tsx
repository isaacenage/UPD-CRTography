"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import SheetHandle from "./SheetHandle";
import { useReducedMotion } from "@/lib/a11y/useReducedMotion";
import { trapFocus } from "@/lib/a11y/focusTrap";

export type SheetSnap = "peek" | "half" | "full";

type Props = {
  children: ReactNode;
  // Controlled snap point — parent owns the state so search results /
  // building selection / route-start can drive snaps imperatively.
  snap: SheetSnap;
  onSnapChange: (next: SheetSnap) => void;
  // Tapped backdrop / swiped past peek calls this so the parent can clear
  // the selected building. Optional — empty-state sheet doesn't need it.
  onDismiss?: () => void;
  peekHeight?: number;
};

const HALF_RATIO = 0.55;
const FULL_RATIO = 0.92;
const SWIPE_DISMISS_THRESHOLD = 80; // pixels past peek required to close
const TAP_DISTANCE_THRESHOLD = 6; // px movement below which a pointer is a tap, not a drag
const TAP_TIME_THRESHOLD = 350; // ms hold below which a pointer is a tap

function nextSnapInCycle(current: SheetSnap): SheetSnap {
  if (current === "peek") return "half";
  if (current === "half") return "full";
  return "peek";
}

function snapHeight(snap: SheetSnap, viewport: number, peek: number): number {
  if (snap === "peek") return peek;
  if (snap === "half") return Math.round(viewport * HALF_RATIO);
  return Math.round(viewport * FULL_RATIO);
}

function nearestSnap(
  height: number,
  velocity: number,
  viewport: number,
  peek: number,
): SheetSnap {
  // Velocity-aware: a fast drag past a midpoint commits to the next snap.
  const half = viewport * HALF_RATIO;
  const full = viewport * FULL_RATIO;
  if (Math.abs(velocity) > 0.6) {
    if (velocity < 0) {
      // Dragging up (height grows)
      if (height > half * 0.7) return "full";
      return "half";
    }
    // Dragging down
    if (height < half * 1.1) return "peek";
    return "half";
  }
  const candidates: Array<[SheetSnap, number]> = [
    ["peek", peek],
    ["half", half],
    ["full", full],
  ];
  let best: SheetSnap = "peek";
  let bestDist = Infinity;
  for (const [name, target] of candidates) {
    const d = Math.abs(target - height);
    if (d < bestDist) {
      bestDist = d;
      best = name;
    }
  }
  return best;
}

export default function BottomSheet({
  children,
  snap,
  onSnapChange,
  onDismiss,
  peekHeight = 120,
}: Props) {
  const sheetRef = useRef<HTMLElement | null>(null);
  const dragStateRef = useRef<{
    startY: number;
    startHeight: number;
    startT: number;
    lastY: number;
    lastT: number;
    velocity: number;
    dragged: boolean;
  } | null>(null);
  const [viewport, setViewport] = useState<number>(0);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const reduced = useReducedMotion();

  // Track viewport (dvh-equivalent) so snaps stay correct across rotation
  // and Android URL-bar collapse.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const measure = () => setViewport(window.innerHeight);
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  const targetHeight = useMemo(
    () => snapHeight(snap, viewport || 800, peekHeight),
    [snap, viewport, peekHeight],
  );

  const currentHeight = dragHeight ?? targetHeight;

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      // Only the handle area (the drag-grip element) initiates a drag —
      // the sheet body must own its own scroll at full snap.
      if (!(e.currentTarget as HTMLElement).dataset.dragHandle) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const now = performance.now();
      dragStateRef.current = {
        startY: e.clientY,
        startHeight: currentHeight,
        startT: now,
        lastY: e.clientY,
        lastT: now,
        velocity: 0,
        dragged: false,
      };
    },
    [currentHeight],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const state = dragStateRef.current;
      if (!state) return;
      const dy = e.clientY - state.startY;
      // Suppress micro-jitter so a tap doesn't get reclassified as a drag.
      if (!state.dragged && Math.abs(dy) < TAP_DISTANCE_THRESHOLD) return;
      state.dragged = true;
      const next = Math.max(40, Math.min((viewport || 800) * 0.96, state.startHeight - dy));
      setDragHeight(next);
      const now = performance.now();
      const dt = Math.max(1, now - state.lastT);
      state.velocity = (e.clientY - state.lastY) / dt; // px/ms (positive = down)
      state.lastY = e.clientY;
      state.lastT = now;
    },
    [viewport],
  );

  const finishDrag = useCallback(() => {
    const state = dragStateRef.current;
    if (!state) return;
    dragStateRef.current = null;
    const finalHeight = dragHeight ?? targetHeight;
    setDragHeight(null);

    // Tap (no meaningful drag) → cycle through snap points so users
    // who can't get the gesture right can still expand/collapse.
    if (!state.dragged && performance.now() - state.startT < TAP_TIME_THRESHOLD) {
      onSnapChange(nextSnapInCycle(snap));
      return;
    }

    // Past peek by enough → dismiss (clears selection if onDismiss provided)
    if (
      onDismiss &&
      finalHeight < peekHeight - SWIPE_DISMISS_THRESHOLD
    ) {
      onDismiss();
      onSnapChange("peek");
      return;
    }

    const next = nearestSnap(finalHeight, state.velocity, viewport || 800, peekHeight);
    onSnapChange(next);
  }, [dragHeight, targetHeight, viewport, peekHeight, onDismiss, onSnapChange, snap]);

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      finishDrag();
    },
    [finishDrag],
  );

  const onPointerCancel = useCallback(() => {
    dragStateRef.current = null;
    setDragHeight(null);
  }, []);

  const onHandleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSnapChange(nextSnapInCycle(snap));
      }
    },
    [snap, onSnapChange],
  );

  // Esc closes from full snap → half (Phase 6 a11y trap also handles this).
  useEffect(() => {
    if (snap !== "full") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onSnapChange("half");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [snap, onSnapChange]);

  // Backdrop tap dismisses to peek when at full snap.
  const showBackdrop = snap === "full";

  const sheetStyle: CSSProperties = {
    height: `${currentHeight}px`,
    paddingBottom: "var(--safe-bottom)",
    transition:
      dragStateRef.current || reduced
        ? "none"
        : "height 220ms cubic-bezier(0.22,0.61,0.36,1)",
    ["--sheet-peek" as string]: `${peekHeight}px`,
  };

  // Focus trap when fully expanded (sheet behaves as a modal-ish surface).
  useEffect(() => {
    if (snap !== "full" || !sheetRef.current) return;
    const cleanup = trapFocus(sheetRef.current);
    return cleanup;
  }, [snap]);

  return (
    <>
      {showBackdrop ? (
        <button
          type="button"
          aria-label="Collapse details panel"
          onClick={() => onSnapChange("half")}
          className="fixed inset-0 z-20 bg-ink/35 dark:bg-black/55 backdrop-blur-[1px] cursor-pointer"
        />
      ) : null}
      <aside
        ref={sheetRef}
        className="absolute left-0 right-0 bottom-0 z-30 bg-paper border-t border-gray-200 rounded-t-xl shadow-[0_-12px_40px_-16px_rgb(26_26_26_/_0.18)] flex flex-col"
        style={sheetStyle}
        role="complementary"
        aria-label="Building details panel"
      >
        {/* Drag handle area: pointer events here own the gesture; the body
            below uses overscroll-behavior: contain to scroll independently.
            Tap (no drag) cycles snap points so the sheet is reachable
            without a precise gesture. */}
        <div
          data-drag-handle="true"
          role="button"
          tabIndex={0}
          aria-label={`Sheet is ${snap}. Tap to ${nextSnapInCycle(snap)}, or drag to resize.`}
          aria-expanded={snap !== "peek"}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onKeyDown={onHandleKeyDown}
          className="cursor-pointer active:cursor-grabbing select-none py-3 -mt-1"
          style={{ touchAction: "none" }}
        >
          <SheetHandle />
        </div>
        <div
          className="flex-1 min-h-0 overflow-y-auto px-5 pb-5"
          style={{ overscrollBehavior: "contain" }}
        >
          {children}
        </div>
      </aside>
    </>
  );
}
