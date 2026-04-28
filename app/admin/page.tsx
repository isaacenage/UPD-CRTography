"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchPhotosForReview,
  type BuildingPhoto,
  type PhotosByBuilding,
} from "@/lib/photos/api";
import { parseBuildingProps, type BuildingProps } from "@/lib/buildingFormat";

const TOKEN_KEY = "upd-crt-admin-token";

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; photos: PhotosByBuilding }
  | { kind: "error"; message: string };

type RowState = "idle" | "working";
type FilterMode = "pending" | "all";

export default function AdminPage() {
  const [token, setToken] = useState<string>("");
  const [tokenInput, setTokenInput] = useState<string>("");
  const [load, setLoad] = useState<LoadState>({ kind: "idle" });
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [filter, setFilter] = useState<FilterMode>("pending");
  const [buildings, setBuildings] = useState<Map<number, BuildingProps>>(
    () => new Map(),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(TOKEN_KEY) ?? "";
    if (saved) {
      setToken(saved);
      setTokenInput(saved);
    }
  }, []);

  // Building names so each section can be labeled with what it represents.
  useEffect(() => {
    let cancelled = false;
    fetch("/data/up-buildings.geojson")
      .then((r) => r.json())
      .then((fc: GeoJSON.FeatureCollection) => {
        if (cancelled || !Array.isArray(fc?.features)) return;
        const map = new Map<number, BuildingProps>();
        for (const f of fc.features) {
          const b = parseBuildingProps(f.properties ?? {});
          map.set(b.id, b);
        }
        setBuildings(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoad({ kind: "loading" });
    try {
      const photos = await fetchPhotosForReview();
      setLoad({ kind: "ready", photos });
    } catch (err) {
      setLoad({ kind: "error", message: messageOf(err) });
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    refresh();
  }, [token, refresh]);

  const onSaveToken = (e: React.FormEvent) => {
    e.preventDefault();
    const t = tokenInput.trim();
    setToken(t);
    if (typeof window !== "undefined") {
      if (t) window.localStorage.setItem(TOKEN_KEY, t);
      else window.localStorage.removeItem(TOKEN_KEY);
    }
  };

  const onSignOut = () => {
    setToken("");
    setTokenInput("");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_KEY);
    }
    setLoad({ kind: "idle" });
  };

  const decide = useCallback(
    async (photo: BuildingPhoto, action: "approve" | "reject") => {
      setRowState((s) => ({ ...s, [photo.id]: "working" }));
      try {
        const res = await fetch(`/api/admin/photos/${photo.id}`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "x-admin-token": token,
          },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        // Apply the change locally instead of refetching the whole list.
        setLoad((curr) =>
          curr.kind === "ready"
            ? { kind: "ready", photos: applyDecision(curr.photos, photo, action) }
            : curr,
        );
      } catch (err) {
        alert(messageOf(err));
      } finally {
        setRowState((s) => {
          const next = { ...s };
          delete next[photo.id];
          return next;
        });
      }
    },
    [token],
  );

  const totals = useMemo(() => {
    if (load.kind !== "ready") return { pending: 0, approved: 0 };
    let pending = 0;
    let approved = 0;
    for (const group of load.photos.values()) {
      pending += group.pending.length;
      approved += group.approved.length;
    }
    return { pending, approved };
  }, [load]);

  if (!token) {
    return (
      <main className="min-h-[100svh] grid place-items-center px-4 bg-paper text-ink">
        <form
          onSubmit={onSaveToken}
          className="w-full max-w-sm rounded-sm border border-gray-200 bg-paper p-5 shadow-sm"
        >
          <h1 className="text-lg font-bold tracking-tight">Photo review</h1>
          <p className="mt-1 text-xs text-gray-500">
            Enter the admin token configured in <code>.env.local</code>.
          </p>
          <input
            type="password"
            inputMode="text"
            autoComplete="off"
            placeholder="ADMIN_TOKEN"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className="mt-4 w-full rounded-sm border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-maroon-500"
          />
          <button
            type="submit"
            className="mt-3 w-full rounded-sm bg-maroon-500 hover:bg-maroon-600 text-white py-2.5 font-bold text-sm tracking-wide"
          >
            Continue
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-[100svh] bg-paper text-ink">
      <header className="border-b border-gray-200 bg-paper sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex flex-wrap items-center gap-3">
          <h1 className="text-base font-bold tracking-tight">Photo review</h1>
          <span className="font-mono text-[10px] tracking-widest uppercase text-gray-500">
            {totals.pending} pending · {totals.approved} approved
          </span>
          <div className="ml-auto flex items-center gap-2">
            <FilterToggle filter={filter} setFilter={setFilter} />
            <button
              type="button"
              onClick={refresh}
              className="rounded-sm border border-gray-200 bg-paper hover:bg-maroon-50 hover:border-maroon-300 px-3 py-1.5 text-xs font-mono tracking-widest uppercase"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="rounded-sm border border-gray-200 bg-paper hover:bg-maroon-50 hover:border-maroon-300 px-3 py-1.5 text-xs font-mono tracking-widest uppercase"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5">
        <Body
          load={load}
          buildings={buildings}
          rowState={rowState}
          decide={decide}
          filter={filter}
        />
      </div>
    </main>
  );
}

function FilterToggle({
  filter,
  setFilter,
}: {
  filter: FilterMode;
  setFilter: (f: FilterMode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="View"
      className="inline-flex rounded-sm border border-gray-200 overflow-hidden"
    >
      <ToggleButton
        active={filter === "pending"}
        onClick={() => setFilter("pending")}
        label="Pending only"
      />
      <ToggleButton
        active={filter === "all"}
        onClick={() => setFilter("all")}
        label="All"
      />
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-mono tracking-widest uppercase transition-colors ${
        active
          ? "bg-maroon-500 text-white"
          : "bg-paper text-ink hover:bg-maroon-50"
      }`}
    >
      {label}
    </button>
  );
}

function Body({
  load,
  buildings,
  rowState,
  decide,
  filter,
}: {
  load: LoadState;
  buildings: Map<number, BuildingProps>;
  rowState: Record<string, RowState>;
  decide: (photo: BuildingPhoto, action: "approve" | "reject") => Promise<void>;
  filter: FilterMode;
}) {
  if (load.kind === "idle" || load.kind === "loading") {
    return (
      <div className="text-center text-sm text-gray-500 py-12">Loading…</div>
    );
  }
  if (load.kind === "error") {
    return (
      <div className="rounded-sm border border-maroon-300 bg-maroon-50 px-3 py-2 text-sm text-maroon-700">
        {load.message}
      </div>
    );
  }

  const visible: Array<{
    buildingId: number;
    approved: readonly BuildingPhoto[];
    pending: readonly BuildingPhoto[];
  }> = [];
  for (const [buildingId, group] of load.photos) {
    if (filter === "pending" && group.pending.length === 0) continue;
    visible.push({ buildingId, ...group });
  }

  if (visible.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="font-mono text-[10px] tracking-widest uppercase text-gray-500">
          {filter === "pending" ? "Inbox zero" : "Nothing to show"}
        </div>
        <div className="mt-2 text-sm text-gray-700">
          {filter === "pending"
            ? "No pending photos. New submissions will appear here."
            : "No photos have been submitted yet."}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      {visible.map((group) => (
        <BuildingSection
          key={group.buildingId}
          buildingId={group.buildingId}
          building={buildings.get(group.buildingId) ?? null}
          approved={group.approved}
          pending={group.pending}
          rowState={rowState}
          decide={decide}
          filter={filter}
        />
      ))}
    </div>
  );
}

function BuildingSection({
  buildingId,
  building,
  approved,
  pending,
  rowState,
  decide,
  filter,
}: {
  buildingId: number;
  building: BuildingProps | null;
  approved: readonly BuildingPhoto[];
  pending: readonly BuildingPhoto[];
  rowState: Record<string, RowState>;
  decide: (photo: BuildingPhoto, action: "approve" | "reject") => Promise<void>;
  filter: FilterMode;
}) {
  return (
    <section className="rounded-sm border border-gray-200 bg-paper">
      <header className="px-4 py-3 border-b border-gray-200">
        <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-gray-500">
          Building {buildingId}
          {building?.acronym ? <> · {building.acronym}</> : null}
        </div>
        <h2 className="mt-1 text-base font-bold tracking-tight">
          {building?.name ?? "Unknown building"}
        </h2>
        <div className="mt-1 font-mono text-[10px] tracking-widest uppercase text-gray-500">
          {pending.length} pending · {approved.length} approved
        </div>
      </header>

      {pending.length > 0 ? (
        <PhotoGroup
          title="Pending review"
          tone="pending"
          photos={pending}
          rowState={rowState}
          decide={decide}
          isApproved={false}
        />
      ) : null}

      {filter === "all" && approved.length > 0 ? (
        <PhotoGroup
          title="Approved"
          tone="approved"
          photos={approved}
          rowState={rowState}
          decide={decide}
          isApproved={true}
        />
      ) : null}
    </section>
  );
}

function PhotoGroup({
  title,
  tone,
  photos,
  rowState,
  decide,
  isApproved,
}: {
  title: string;
  tone: "pending" | "approved";
  photos: readonly BuildingPhoto[];
  rowState: Record<string, RowState>;
  decide: (photo: BuildingPhoto, action: "approve" | "reject") => Promise<void>;
  isApproved: boolean;
}) {
  const dotColor =
    tone === "pending" ? "bg-track-500" : "bg-forest-500";
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <div className="px-4 py-2 flex items-center gap-2">
        <span aria-hidden className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span className="font-mono text-[10px] tracking-widest uppercase text-gray-700">
          {title} · {photos.length}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-3 px-4 pb-4">
        {photos.map((p) => (
          <PhotoRow
            key={p.id}
            photo={p}
            state={rowState[p.id] ?? "idle"}
            isApproved={isApproved}
            onApprove={() => decide(p, "approve")}
            onReject={() => decide(p, "reject")}
          />
        ))}
      </ul>
    </div>
  );
}

function PhotoRow({
  photo,
  state,
  isApproved,
  onApprove,
  onReject,
}: {
  photo: BuildingPhoto;
  state: RowState;
  isApproved: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const submittedAgo = useMemo(() => relativeTime(photo.createdAt), [photo.createdAt]);
  const busy = state === "working";

  return (
    <li className="rounded-sm border border-gray-200 bg-paper overflow-hidden">
      <img
        src={photo.publicUrl}
        alt={photo.description}
        className="w-full max-h-[60vh] object-contain bg-gray-100"
      />
      <div className="px-4 py-3">
        <div className="text-sm font-medium text-ink leading-snug">
          {photo.description}
        </div>
        <div className="mt-1 font-mono text-[9px] tracking-[0.2em] uppercase text-gray-500">
          submitted {submittedAgo}
          {photo.approvedAt
            ? ` · approved ${relativeTime(photo.approvedAt)}`
            : null}
        </div>
      </div>
      {isApproved ? (
        <div className="p-3 border-t border-gray-200">
          <button
            type="button"
            disabled={busy}
            onClick={onReject}
            className="w-full rounded-sm border border-maroon-200 bg-paper hover:bg-maroon-50 hover:border-maroon-300 text-maroon-700 disabled:opacity-50 py-2.5 text-xs font-mono tracking-widest uppercase"
          >
            {busy ? "Removing…" : "Remove approved photo"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 p-3 border-t border-gray-200">
          <button
            type="button"
            disabled={busy}
            onClick={onReject}
            className="rounded-sm border border-gray-200 bg-paper hover:bg-maroon-50 hover:border-maroon-300 disabled:opacity-50 py-2.5 text-xs font-mono tracking-widest uppercase"
          >
            {busy ? "…" : "Reject"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onApprove}
            className="rounded-sm bg-forest-500 hover:bg-forest-600 disabled:bg-gray-300 text-white py-2.5 text-xs font-mono tracking-widest uppercase"
          >
            {busy ? "Working…" : "Approve"}
          </button>
        </div>
      )}
    </li>
  );
}

function applyDecision(
  current: PhotosByBuilding,
  photo: BuildingPhoto,
  action: "approve" | "reject",
): PhotosByBuilding {
  // Immutable update — clone the affected building's group, leave the
  // rest of the map alone. The Map is replaced wholesale so React sees
  // a new reference.
  const next = new Map(current);
  const group = next.get(photo.buildingId);
  if (!group) return current;

  if (action === "approve") {
    const pending = group.pending.filter((p) => p.id !== photo.id);
    const approved = [
      ...group.approved,
      { ...photo, status: "approved" as const, approvedAt: new Date().toISOString() },
    ];
    next.set(photo.buildingId, { approved, pending });
  } else {
    const pending = group.pending.filter((p) => p.id !== photo.id);
    const approved = group.approved.filter((p) => p.id !== photo.id);
    if (pending.length === 0 && approved.length === 0) {
      next.delete(photo.buildingId);
    } else {
      next.set(photo.buildingId, { approved, pending });
    }
  }
  return next;
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = Date.now() - t;
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}
