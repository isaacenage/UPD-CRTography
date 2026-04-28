"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchApprovedPhotos, type BuildingPhoto } from "@/lib/photos/api";
import {
  REPORT_COMMENT_MAX,
  REPORT_COMMENT_MIN,
  submitPhotoReports,
} from "@/lib/photos/reports";

type Props = {
  open: boolean;
  buildingId: number | null;
  buildingName: string;
  onClose: () => void;
};

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; photos: readonly BuildingPhoto[] }
  | { kind: "error"; message: string };

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "done"; count: number }
  | { kind: "error"; message: string };

export default function ReportPhotoModal({
  open,
  buildingId,
  buildingName,
  onClose,
}: Props) {
  const [load, setLoad] = useState<LoadState>({ kind: "idle" });
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [comment, setComment] = useState("");
  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });

  // Reset state every time the modal is reopened or the target building
  // changes — stale selections shouldn't bleed into the next session.
  useEffect(() => {
    if (!open || buildingId == null) return;
    setSelected(new Set());
    setComment("");
    setSubmit({ kind: "idle" });
    let cancelled = false;
    setLoad({ kind: "loading" });
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
  }, [open, buildingId]);

  // Esc closes (matches InfoPanelModal behavior).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const trimmed = comment.trim();
  const commentValid =
    trimmed.length >= REPORT_COMMENT_MIN && trimmed.length <= REPORT_COMMENT_MAX;
  const canSubmit = selected.size > 0 && commentValid && submit.kind !== "submitting";

  const togglePhoto = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmit({ kind: "submitting" });
    try {
      const ids = Array.from(selected);
      await submitPhotoReports(ids, trimmed);
      setSubmit({ kind: "done", count: ids.length });
    } catch (err) {
      setSubmit({ kind: "error", message: messageOf(err) });
    }
  };

  const photos = useMemo(
    () => (load.kind === "ready" ? load.photos : []),
    [load],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-photo-title"
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-white/85 dark:bg-black/85 backdrop-blur-md text-black dark:text-white animate-[fadeIn_140ms_ease-out]"
      style={{
        paddingTop: "max(var(--safe-top), 0px)",
        paddingBottom: "max(var(--safe-bottom), 0px)",
        paddingLeft: "max(var(--safe-left), 0px)",
        paddingRight: "max(var(--safe-right), 0px)",
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
        className="absolute z-20 w-12 h-12 grid place-items-center rounded-full bg-paper/80 dark:bg-black/50 text-black dark:text-white border border-gray-200/60 dark:border-white/15 backdrop-blur-sm hover:bg-paper dark:hover:bg-black/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
        style={{
          top: "calc(max(var(--safe-top), 0px) + 12px)",
          right: "calc(max(var(--safe-right), 0px) + 12px)",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-7 h-7"
          aria-hidden
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full overflow-y-auto px-6 pt-20 sm:pt-24 pb-12 sm:pb-16 grid place-items-start"
      >
        <div className="w-full max-w-xl mx-auto space-y-5">
          <div>
            <div
              id="report-photo-title"
              className="font-mono text-[10px] tracking-[0.25em] uppercase opacity-70"
            >
              Report a photo
            </div>
            <div className="mt-1 text-lg sm:text-xl font-light">
              {buildingName}
            </div>
          </div>

          {submit.kind === "done" ? (
            <DoneState count={submit.count} onClose={onClose} />
          ) : (
            <ReportForm
              load={load}
              photos={photos}
              selected={selected}
              togglePhoto={togglePhoto}
              comment={comment}
              setComment={setComment}
              commentValid={commentValid}
              submitState={submit}
              canSubmit={canSubmit}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ReportForm({
  load,
  photos,
  selected,
  togglePhoto,
  comment,
  setComment,
  commentValid,
  submitState,
  canSubmit,
  onSubmit,
}: {
  load: LoadState;
  photos: readonly BuildingPhoto[];
  selected: Set<string>;
  togglePhoto: (id: string) => void;
  comment: string;
  setComment: (s: string) => void;
  commentValid: boolean;
  submitState: SubmitState;
  canSubmit: boolean;
  onSubmit: () => void;
}) {
  return (
    <>
      <p className="text-sm sm:text-base font-light opacity-80">
        Pick the photos you'd like to flag for review and explain what's
        wrong. The dev will see your report and either keep the photo or
        remove it.
      </p>

      {load.kind === "loading" ? (
        <div className="opacity-70 text-sm">Loading photos…</div>
      ) : null}

      {load.kind === "error" ? (
        <div className="text-sm opacity-90">{load.message}</div>
      ) : null}

      {load.kind === "ready" && photos.length === 0 ? (
        <div className="opacity-70 text-sm">
          No approved photos yet — nothing to report.
        </div>
      ) : null}

      {load.kind === "ready" && photos.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3">
          {photos.map((photo) => (
            <PhotoChoice
              key={photo.id}
              photo={photo}
              checked={selected.has(photo.id)}
              onToggle={() => togglePhoto(photo.id)}
            />
          ))}
        </ul>
      ) : null}

      {load.kind === "ready" && photos.length > 0 ? (
        <div className="space-y-2">
          <label
            htmlFor="report-comment"
            className="font-mono text-[10px] tracking-[0.25em] uppercase opacity-70"
          >
            What's the issue?
          </label>
          <textarea
            id="report-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder={`e.g. "troll entry, there's no bidet here"`}
            className="w-full bg-transparent border-b border-current/40 focus:border-current outline-none resize-none text-base font-light placeholder:opacity-50 py-1"
            maxLength={REPORT_COMMENT_MAX + 40}
          />
          <div className="flex items-center justify-between text-[11px] opacity-70">
            <span>Required · shown to the dev only.</span>
            <span>
              {comment.length}/{REPORT_COMMENT_MAX}
            </span>
          </div>
        </div>
      ) : null}

      {submitState.kind === "error" ? (
        <div className="text-sm opacity-90">{submitState.message}</div>
      ) : null}

      {load.kind === "ready" && photos.length > 0 ? (
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="flex-1 rounded-sm border-2 border-current py-3 font-mono text-xs tracking-[0.2em] uppercase disabled:opacity-40 disabled:cursor-not-allowed hover:bg-current/5 transition-colors"
          >
            {submitState.kind === "submitting"
              ? "Sending…"
              : `Submit report${selected.size > 1 ? `s (${selected.size})` : ""}`}
          </button>
        </div>
      ) : null}

      {load.kind === "ready" && photos.length > 0 && !commentValid && comment.length > 0 ? (
        <div className="text-xs opacity-70">
          Comment needs to be at least {REPORT_COMMENT_MIN} characters.
        </div>
      ) : null}
    </>
  );
}

function PhotoChoice({
  photo,
  checked,
  onToggle,
}: {
  photo: BuildingPhoto;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <label
        className={`flex gap-3 cursor-pointer rounded-sm transition-opacity ${
          checked ? "opacity-100" : "opacity-80 hover:opacity-100"
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="sr-only"
        />
        <div
          aria-hidden
          className={`mt-1 w-5 h-5 shrink-0 rounded-sm border-2 border-current grid place-items-center ${
            checked ? "bg-current text-white dark:text-black" : ""
          }`}
        >
          {checked ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3 h-3"
            >
              <path d="m5 12 5 5L20 7" />
            </svg>
          ) : null}
        </div>
        <div className="flex gap-3 flex-1 min-w-0">
          <img
            src={photo.publicUrl}
            alt={photo.description}
            loading="lazy"
            className="w-20 h-20 object-cover rounded-sm bg-black/10 dark:bg-white/10 shrink-0"
          />
          <div className="min-w-0 py-1">
            <div className="text-sm font-medium leading-snug break-words">
              {photo.description}
            </div>
            <div className="mt-1 font-mono text-[10px] tracking-widest uppercase opacity-60">
              Approved photo
            </div>
          </div>
        </div>
      </label>
    </li>
  );
}

function DoneState({ count, onClose }: { count: number; onClose: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-base sm:text-lg font-light">
        Thanks — your report{count > 1 ? "s have" : " has"} been sent. The dev
        will review {count > 1 ? "them" : "it"} on /admin and either retain or
        remove the photo.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="rounded-sm border-2 border-current px-5 py-2.5 font-mono text-xs tracking-[0.2em] uppercase hover:bg-current/5 transition-colors"
      >
        Close
      </button>
    </div>
  );
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong.";
}
