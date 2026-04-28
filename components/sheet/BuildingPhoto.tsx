"use client";

import { useEffect, useRef, useState } from "react";
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  fetchApprovedPhotos,
  uploadBuildingPhoto,
  type BuildingPhoto,
} from "@/lib/photos/api";

type Props = { buildingId: number; buildingName: string };

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; photos: readonly BuildingPhoto[] }
  | { kind: "error"; message: string };

type SubmitState =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "submitted" }
  | { kind: "error"; message: string };

export default function BuildingPhotoPanel({ buildingId, buildingName }: Props) {
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const trimmed = description.trim();
  const captionValid =
    trimmed.length >= DESCRIPTION_MIN && trimmed.length <= DESCRIPTION_MAX;

  useEffect(() => {
    let cancelled = false;
    setLoad({ kind: "loading" });
    setSubmit({ kind: "idle" });
    setDescription("");
    fetchApprovedPhotos(buildingId)
      .then((photos) => {
        if (cancelled) return;
        setLoad({ kind: "ready", photos });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoad({ kind: "error", message: messageOf(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [buildingId]);

  const onPick = () => {
    if (!captionValid) {
      setSubmit({
        kind: "error",
        message: "Please describe where in the building this photo was taken.",
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (!captionValid) {
      setSubmit({
        kind: "error",
        message: "Please describe where in the building this photo was taken.",
      });
      return;
    }
    setSubmit({ kind: "uploading" });
    try {
      await uploadBuildingPhoto(buildingId, file, trimmed);
      setSubmit({ kind: "submitted" });
      setDescription("");
    } catch (err) {
      setSubmit({ kind: "error", message: messageOf(err) });
    }
  };

  const onAddAnother = () => {
    setSubmit({ kind: "idle" });
  };

  return (
    <section className="mt-4">
      <div className="font-mono text-[10px] tracking-widest uppercase text-gray-500 mb-2">
        Photos
      </div>

      {load.kind === "loading" ? <Frame label="Loading…" /> : null}

      {load.kind === "error" ? (
        <div className="rounded-sm border border-maroon-300 bg-maroon-50 px-3 py-2 text-xs text-maroon-700">
          {load.message}
        </div>
      ) : null}

      {load.kind === "ready" && load.photos.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3 mb-3">
          {load.photos.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} buildingName={buildingName} />
          ))}
        </ul>
      ) : null}

      {load.kind === "ready" && load.photos.length === 0 ? (
        <div className="rounded-sm border border-dashed border-gray-300 bg-paper px-3 py-4 mb-3 text-center text-xs text-gray-500">
          No approved photos yet. Be the first to submit one.
        </div>
      ) : null}

      <UploadForm
        description={description}
        setDescription={setDescription}
        captionValid={captionValid}
        submit={submit}
        onPick={onPick}
        onAddAnother={onAddAnother}
        fileInputRef={fileInputRef}
        onFileChange={onFileChange}
      />
    </section>
  );
}

function PhotoCard({
  photo,
  buildingName,
}: {
  photo: BuildingPhoto;
  buildingName: string;
}) {
  return (
    <li className="rounded-sm overflow-hidden border border-gray-200 bg-paper">
      <img
        src={photo.publicUrl}
        alt={`${buildingName} — ${photo.description}`}
        loading="lazy"
        className="w-full aspect-[4/3] object-cover bg-gray-100"
      />
      <figcaption className="px-3 py-2 border-t border-gray-200">
        <div className="text-sm text-ink leading-snug">{photo.description}</div>
        <div className="mt-1 font-mono text-[9px] tracking-widest uppercase text-gray-500">
          Community photo
        </div>
      </figcaption>
    </li>
  );
}

function UploadForm({
  description,
  setDescription,
  captionValid,
  submit,
  onPick,
  onAddAnother,
  fileInputRef,
  onFileChange,
}: {
  description: string;
  setDescription: (s: string) => void;
  captionValid: boolean;
  submit: SubmitState;
  onPick: () => void;
  onAddAnother: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  if (submit.kind === "uploading") {
    return <Frame label="Uploading…" />;
  }
  if (submit.kind === "submitted") {
    return (
      <div className="rounded-sm border border-forest-300 bg-forest-50 px-3 py-3">
        <div className="font-mono text-[9px] tracking-widest uppercase text-forest-700">
          Submitted · awaiting review
        </div>
        <div className="mt-1 text-sm text-forest-800">
          Thanks! Your photo is in the review queue.
        </div>
        <button
          type="button"
          onClick={onAddAnother}
          className="mt-3 w-full rounded-sm border border-forest-300 bg-paper hover:bg-forest-50 text-forest-700 py-2 text-xs font-mono tracking-widest uppercase"
        >
          Add another
        </button>
      </div>
    );
  }

  const remaining = DESCRIPTION_MAX - description.length;
  const overLimit = remaining < 0;

  return (
    <div className="rounded-sm border border-gray-200 bg-paper p-3">
      <label
        htmlFor="photo-description"
        className="font-mono text-[10px] tracking-widest uppercase text-gray-500"
      >
        Where in the building?
      </label>
      <input
        id="photo-description"
        type="text"
        autoComplete="off"
        maxLength={DESCRIPTION_MAX + 40 /* let users see the over-limit warning */}
        placeholder="e.g. 2nd Floor Women's CR"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="mt-1 w-full rounded-sm border border-gray-300 bg-paper px-3 py-2 text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-maroon-500"
      />
      <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">
        <span>Required · shown publicly under the photo.</span>
        <span className={overLimit ? "text-maroon-600 font-medium" : ""}>
          {description.length}/{DESCRIPTION_MAX}
        </span>
      </div>

      {submit.kind === "error" ? (
        <div className="mt-2 rounded-sm border border-maroon-300 bg-maroon-50 px-3 py-2 text-xs text-maroon-700">
          {submit.message}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onPick}
        disabled={!captionValid}
        className="mt-3 w-full rounded-sm border border-dashed border-gray-300 bg-paper hover:bg-maroon-50 hover:border-maroon-300 disabled:opacity-50 disabled:cursor-not-allowed text-ink py-5 grid place-items-center gap-2 transition-colors min-h-[100px]"
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
    </div>
  );
}

function Frame({ label }: { label: string }) {
  return (
    <div className="rounded-sm border border-gray-200 bg-gray-100 text-gray-500 aspect-[4/3] grid place-items-center font-mono text-[10px] tracking-widest uppercase">
      {label}
    </div>
  );
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong.";
}
