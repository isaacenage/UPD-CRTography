"use client";

import { useEffect, useRef, useState } from "react";
import {
  fetchApprovedPhoto,
  uploadBuildingPhoto,
  type BuildingPhoto,
} from "@/lib/photos/api";

type Props = { buildingId: number; buildingName: string };

type UiState =
  | { kind: "loading" }
  | { kind: "approved"; photo: BuildingPhoto }
  | { kind: "empty" }
  | { kind: "uploading" }
  | { kind: "submitted" }
  | { kind: "error"; message: string };

export default function BuildingPhotoPanel({ buildingId, buildingName }: Props) {
  const [state, setState] = useState<UiState>({ kind: "loading" });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    fetchApprovedPhoto(buildingId)
      .then((photo) => {
        if (cancelled) return;
        setState(photo ? { kind: "approved", photo } : { kind: "empty" });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({ kind: "error", message: messageOf(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [buildingId]);

  const onPick = () => fileInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setState({ kind: "uploading" });
    try {
      await uploadBuildingPhoto(buildingId, file);
      setState({ kind: "submitted" });
    } catch (err) {
      setState({ kind: "error", message: messageOf(err) });
    }
  };

  return (
    <section className="mt-4">
      <div className="font-mono text-[10px] tracking-widest uppercase text-gray-500 mb-2">
        Photo
      </div>

      {state.kind === "loading" ? <Frame label="Loading…" /> : null}

      {state.kind === "approved" ? (
        <figure className="rounded-sm overflow-hidden border border-gray-200 bg-gray-100">
          <img
            src={state.photo.publicUrl}
            alt={`${buildingName} — submitted by a community contributor`}
            loading="lazy"
            className="w-full aspect-[4/3] object-cover"
          />
          <figcaption className="px-3 py-2 font-mono text-[9px] tracking-widest uppercase text-gray-500 bg-paper border-t border-gray-200">
            Community photo · approved
          </figcaption>
        </figure>
      ) : null}

      {state.kind === "empty" ? (
        <UploadButton onClick={onPick} />
      ) : null}

      {state.kind === "uploading" ? (
        <Frame label="Uploading…" />
      ) : null}

      {state.kind === "submitted" ? (
        <Frame label="Submitted · awaiting review" tone="success" />
      ) : null}

      {state.kind === "error" ? (
        <div className="rounded-sm border border-maroon-300 bg-maroon-50 px-3 py-2 text-xs text-maroon-700">
          {state.message}
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFileChange}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
      />
    </section>
  );
}

function UploadButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-sm border border-dashed border-gray-300 bg-paper hover:bg-maroon-50 hover:border-maroon-300 text-ink py-6 grid place-items-center gap-2 transition-colors min-h-[120px]"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-7 h-7 text-gray-500"
        aria-hidden
      >
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
      <span className="font-mono text-[10px] tracking-widest uppercase text-gray-500">
        Take a photo
      </span>
      <span className="text-[11px] text-gray-400">
        Camera only · awaits dev approval
      </span>
    </button>
  );
}

function Frame({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success";
}) {
  const cls =
    tone === "success"
      ? "border-forest-300 bg-forest-50 text-forest-700"
      : "border-gray-200 bg-gray-100 text-gray-500";
  return (
    <div
      className={`rounded-sm border ${cls} aspect-[4/3] grid place-items-center font-mono text-[10px] tracking-widest uppercase`}
    >
      {label}
    </div>
  );
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong.";
}
