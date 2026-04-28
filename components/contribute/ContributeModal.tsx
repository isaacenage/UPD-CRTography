"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import {
  BUILDING_NAME_MAX,
  BUILDING_NAME_MIN,
  submitContribution,
} from "@/lib/contributions/api";
import {
  CONTRIBUTION_ACCESS,
  CONTRIBUTION_GENDERS,
  type Contribution,
  type ContributionAccess,
  type ContributionGender,
} from "@/lib/contributions/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmitted: (c: Contribution) => void;
};

type LocState =
  | { kind: "idle" }
  | { kind: "requesting" }
  | { kind: "ready"; lng: number; lat: number; accuracy: number }
  | { kind: "error"; message: string };

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string };

export default function ContributeModal({ open, onClose, onSubmitted }: Props) {
  const [name, setName] = useState("");
  const [loc, setLoc] = useState<LocState>({ kind: "idle" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [gender, setGender] = useState<ContributionGender>("All-Gender");
  const [access, setAccess] = useState<ContributionAccess>(
    "Students and Staff",
  );
  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Reset form on open. Avoids stale state if the user re-opens the
  // modal after dismissing mid-flow.
  useEffect(() => {
    if (!open) return;
    setName("");
    setLoc({ kind: "idle" });
    setPhoto(null);
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setGender("All-Gender");
    setAccess("Students and Staff");
    setSubmit({ kind: "idle" });
  }, [open]);

  // Esc closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Revoke object URL when the modal unmounts so the blob can be GCed.
  useEffect(() => {
    return () => {
      setPhotoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, []);

  if (!open) return null;

  const trimmed = name.trim();
  const nameValid =
    trimmed.length >= BUILDING_NAME_MIN && trimmed.length <= BUILDING_NAME_MAX;

  const requestLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLoc({
        kind: "error",
        message:
          "Your browser doesn't expose a location API. Try a different browser.",
      });
      return;
    }
    setLoc({ kind: "requesting" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLoc({
          kind: "ready",
          lng: position.coords.longitude,
          lat: position.coords.latitude,
          accuracy: position.coords.accuracy,
        });
      },
      (err) => {
        setLoc({
          kind: "error",
          message: locationErrorMessage(err),
        });
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  };

  const onPhotoPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // re-pick same file
    if (!file) return;
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setPhoto(file);
  };

  const canSubmit =
    nameValid &&
    loc.kind === "ready" &&
    photo !== null &&
    submit.kind !== "submitting";

  const handleSubmit = async () => {
    if (!canSubmit || loc.kind !== "ready" || !photo) return;
    setSubmit({ kind: "submitting" });
    try {
      const created = await submitContribution({
        buildingName: trimmed,
        longitude: loc.lng,
        latitude: loc.lat,
        photo,
        gender,
        access,
      });
      onSubmitted(created);
      onClose();
    } catch (err) {
      setSubmit({ kind: "error", message: messageOf(err) });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contribute-title"
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
        <div className="w-full max-w-xl mx-auto space-y-6">
          <header>
            <div
              id="contribute-title"
              className="font-mono text-[10px] tracking-[0.25em] uppercase opacity-70"
            >
              Contribute a new building
            </div>
            <p className="mt-2 text-lg sm:text-xl font-light leading-snug">
              Found a building with a bidet that's not included in this map?
            </p>
            <p className="mt-1 text-sm font-light opacity-70">
              Submissions are reviewed by the dev before they're folded into
              the official dataset.
            </p>
          </header>

          <Field
            label="Step 1 · Building name"
            hint="What do students call this building?"
          >
            <input
              type="text"
              autoComplete="off"
              maxLength={BUILDING_NAME_MAX + 40}
              placeholder="e.g. Melchor Hall"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent border-b border-current/40 focus:border-current outline-none text-base font-light placeholder:opacity-50 py-1.5"
            />
            <Counter current={name.length} max={BUILDING_NAME_MAX} />
          </Field>

          <Field
            label="Step 2 · Exact location"
            hint="We use your phone's GPS so the dev can place the marker accurately."
          >
            <LocationCapture state={loc} onRequest={requestLocation} />
          </Field>

          <Field
            label="Step 3 · Photo"
            hint="A photo from your camera is required so the dev can verify the bidet exists."
          >
            <PhotoCapture
              ref={photoInputRef}
              previewUrl={photoPreview}
              onPick={() => photoInputRef.current?.click()}
              onChange={onPhotoPicked}
            />
          </Field>

          <Field label="Step 4 · Who can use it?">
            <Select<ContributionGender>
              value={gender}
              options={CONTRIBUTION_GENDERS}
              onChange={setGender}
              ariaLabel="Gender"
            />
          </Field>

          <Field label="Step 5 · Access level">
            <Select<ContributionAccess>
              value={access}
              options={CONTRIBUTION_ACCESS}
              onChange={setAccess}
              ariaLabel="Access"
            />
          </Field>

          {submit.kind === "error" ? (
            <div className="text-sm opacity-90">{submit.message}</div>
          ) : null}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full rounded-sm border-2 border-current py-3 font-mono text-xs tracking-[0.2em] uppercase disabled:opacity-40 disabled:cursor-not-allowed hover:bg-current/5 transition-colors min-h-[52px]"
          >
            {submit.kind === "submitting" ? "Submitting…" : "Submit contribution"}
          </button>

          <p className="text-[11px] opacity-60 leading-relaxed">
            Submitting requires location services and camera access. Your
            photo and coordinates are sent so a dev can verify and add this
            building to the official map.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="font-mono text-[10px] tracking-[0.25em] uppercase opacity-70">
        {label}
      </div>
      {hint ? (
        <p className="text-[11px] sm:text-xs opacity-70 leading-snug -mt-1">
          {hint}
        </p>
      ) : null}
      {children}
    </div>
  );
}

function Counter({ current, max }: { current: number; max: number }) {
  const over = current > max;
  return (
    <div className="flex justify-end text-[10px] opacity-60">
      <span className={over ? "opacity-100" : ""}>
        {current}/{max}
      </span>
    </div>
  );
}

function LocationCapture({
  state,
  onRequest,
}: {
  state: LocState;
  onRequest: () => void;
}) {
  if (state.kind === "ready") {
    return (
      <div className="rounded-sm border border-current/30 px-3 py-2.5 text-sm font-light flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[10px] tracking-widest uppercase opacity-70">
            Captured
          </div>
          <div className="mt-0.5 break-all">
            {state.lat.toFixed(6)}, {state.lng.toFixed(6)}
          </div>
          <div className="mt-0.5 text-[11px] opacity-60">
            ±{Math.round(state.accuracy)}m accuracy
          </div>
        </div>
        <button
          type="button"
          onClick={onRequest}
          className="shrink-0 font-mono text-[10px] tracking-[0.2em] uppercase underline underline-offset-4 hover:opacity-70 self-center"
        >
          Re-pin
        </button>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="space-y-2">
        <div className="text-sm opacity-90">{state.message}</div>
        <button
          type="button"
          onClick={onRequest}
          className="w-full rounded-sm border border-current/40 py-2.5 font-mono text-[11px] tracking-[0.2em] uppercase hover:bg-current/5 transition-colors min-h-[44px]"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onRequest}
      disabled={state.kind === "requesting"}
      className="w-full rounded-sm border border-current/40 py-3 font-mono text-[11px] tracking-[0.2em] uppercase hover:bg-current/5 transition-colors min-h-[48px] disabled:opacity-50"
    >
      {state.kind === "requesting" ? "Locating…" : "Use my current location"}
    </button>
  );
}

type PhotoProps = {
  previewUrl: string | null;
  onPick: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const PhotoCapture = forwardRef<HTMLInputElement, PhotoProps>(
  function PhotoCapture({ previewUrl, onPick, onChange }, ref) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={onPick}
          className="w-full rounded-sm border border-dashed border-current/40 py-5 grid place-items-center gap-2 hover:bg-current/5 transition-colors min-h-[120px]"
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Selected building"
              className="w-32 h-32 object-cover rounded-sm"
            />
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-7 h-7 opacity-70"
              aria-hidden
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-70">
            {previewUrl ? "Re-take photo" : "Take a photo"}
          </span>
        </button>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onChange}
          className="sr-only"
          aria-hidden
          tabIndex={-1}
        />
      </div>
    );
  },
);

function Select<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full appearance-none bg-transparent border border-current/40 rounded-sm px-3 py-2.5 pr-8 text-sm font-light focus:outline-none focus:border-current min-h-[44px]"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-paper text-ink">
            {o}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-70"
        aria-hidden
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

function locationErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Location permission was denied. Enable location services for this site to continue.";
    case err.POSITION_UNAVAILABLE:
      return "Couldn't pin your location. Step outside or near a window and try again.";
    case err.TIMEOUT:
      return "Location lookup timed out. Try again from a spot with a clearer sky.";
    default:
      return "Couldn't read your location.";
  }
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong submitting your contribution.";
}
