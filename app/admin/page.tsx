"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchPendingPhotos, type BuildingPhoto } from "@/lib/photos/api";
import { parseBuildingProps, type BuildingProps } from "@/lib/buildingFormat";

const TOKEN_KEY = "upd-crt-admin-token";

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; photos: readonly BuildingPhoto[] }
  | { kind: "error"; message: string };

type RowState = "idle" | "working" | "done";

export default function AdminPage() {
  const [token, setToken] = useState<string>("");
  const [tokenInput, setTokenInput] = useState<string>("");
  const [load, setLoad] = useState<LoadState>({ kind: "idle" });
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [buildings, setBuildings] = useState<Map<number, BuildingProps>>(
    () => new Map(),
  );

  // Restore token on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(TOKEN_KEY) ?? "";
    if (saved) {
      setToken(saved);
      setTokenInput(saved);
    }
  }, []);

  // Load building names so the admin sees what each photo is *for*.
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
      const photos = await fetchPendingPhotos();
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
        setRowState((s) => ({ ...s, [photo.id]: "done" }));
        // Drop the row from the visible list immediately.
        setLoad((curr) =>
          curr.kind === "ready"
            ? {
                kind: "ready",
                photos: curr.photos.filter((p) => p.id !== photo.id),
              }
            : curr,
        );
      } catch (err) {
        setRowState((s) => ({ ...s, [photo.id]: "idle" }));
        alert(messageOf(err));
      }
    },
    [token],
  );

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
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <h1 className="text-base font-bold tracking-tight">Photo review</h1>
          <span className="font-mono text-[10px] tracking-widest uppercase text-gray-500">
            Pending submissions
          </span>
          <div className="ml-auto flex items-center gap-2">
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
        <Body load={load} buildings={buildings} rowState={rowState} decide={decide} />
      </div>
    </main>
  );
}

function Body({
  load,
  buildings,
  rowState,
  decide,
}: {
  load: LoadState;
  buildings: Map<number, BuildingProps>;
  rowState: Record<string, RowState>;
  decide: (photo: BuildingPhoto, action: "approve" | "reject") => Promise<void>;
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
  if (load.photos.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="font-mono text-[10px] tracking-widest uppercase text-gray-500">
          Inbox zero
        </div>
        <div className="mt-2 text-sm text-gray-700">
          No pending photos. New submissions will appear here.
        </div>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-4">
      {load.photos.map((p) => (
        <PhotoRow
          key={p.id}
          photo={p}
          building={buildings.get(p.buildingId) ?? null}
          state={rowState[p.id] ?? "idle"}
          onApprove={() => decide(p, "approve")}
          onReject={() => decide(p, "reject")}
        />
      ))}
    </ul>
  );
}

function PhotoRow({
  photo,
  building,
  state,
  onApprove,
  onReject,
}: {
  photo: BuildingPhoto;
  building: BuildingProps | null;
  state: RowState;
  onApprove: () => void;
  onReject: () => void;
}) {
  const submittedAgo = useMemo(() => relativeTime(photo.createdAt), [photo.createdAt]);
  const busy = state === "working";
  return (
    <li className="rounded-sm border border-gray-200 bg-paper overflow-hidden">
      <img
        src={photo.publicUrl}
        alt={building?.name ?? `Building ${photo.buildingId}`}
        className="w-full max-h-[60vh] object-contain bg-gray-100"
      />
      <div className="px-4 py-3">
        <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-gray-500">
          Building {photo.buildingId}
          {building?.acronym ? <> · {building.acronym}</> : null}
          {" · "}
          {submittedAgo}
        </div>
        <div className="mt-1 text-sm font-bold tracking-tight">
          {building?.name ?? "Unknown building"}
        </div>
      </div>
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
    </li>
  );
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
