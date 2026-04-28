// Tiny localStorage-backed cache for user contributions. The Supabase
// table is the source of truth devs review against, but a successful
// submission also seeds this cache so the new pin appears on the map
// immediately even if the network round-trip is still in flight (or the
// table doesn't exist yet — in which case this is the only persistence).

import type { Contribution } from "./types";

const STORAGE_KEY = "hb:contributions";

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readLocalContributions(): readonly Contribution[] {
  const store = safeStorage();
  if (!store) return [];
  const raw = store.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isContribution);
  } catch {
    return [];
  }
}

export function appendLocalContribution(c: Contribution): void {
  const store = safeStorage();
  if (!store) return;
  const all = [...readLocalContributions(), c];
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Quota exceeded or private mode — surface nothing; the caller
    // already has the value in-memory for the current session.
  }
}

function isContribution(value: unknown): value is Contribution {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.buildingName === "string" &&
    typeof v.longitude === "number" &&
    typeof v.latitude === "number" &&
    typeof v.gender === "string" &&
    typeof v.access === "string"
  );
}
