// Submit + fetch user-contributed buildings.
//
// Storage strategy:
//   - Photo uploads always go to the Supabase storage bucket so the dev
//     can review them centrally.
//   - Metadata is inserted into `up_user_contributions` if that table
//     exists (see contributions_table.sql for the migration). When the
//     table is missing or RLS blocks the insert, we still persist the
//     entry locally so the user's pin appears on their map. Either way
//     the photo lands in storage so a dev can pair it with the local
//     entry later.

import { getSupabase, PHOTO_BUCKET } from "@/lib/supabase/client";
import { compressImage } from "@/lib/photos/compress";
import { appendLocalContribution, readLocalContributions } from "./local";
import type {
  Contribution,
  ContributionAccess,
  ContributionGender,
} from "./types";

export const BUILDING_NAME_MIN = 2;
export const BUILDING_NAME_MAX = 120;

export const CONTRIBUTIONS_TABLE = "up_user_contributions";
const TABLE = CONTRIBUTIONS_TABLE;

const SELECT_COLUMNS =
  "id, building_name, longitude, latitude, storage_path, gender, access, status, created_at";

type Row = {
  id: string;
  building_name: string;
  longitude: number;
  latitude: number;
  storage_path: string | null;
  gender: ContributionGender;
  access: ContributionAccess;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

function rowToContribution(row: Row): Contribution {
  let photoUrl: string | null = null;
  if (row.storage_path) {
    try {
      const sb = getSupabase();
      const { data } = sb.storage.from(PHOTO_BUCKET).getPublicUrl(row.storage_path);
      photoUrl = data.publicUrl;
    } catch {
      photoUrl = null;
    }
  }
  return {
    id: row.id,
    buildingName: row.building_name,
    longitude: row.longitude,
    latitude: row.latitude,
    storagePath: row.storage_path,
    photoUrl,
    gender: row.gender,
    access: row.access,
    status: row.status,
    createdAt: row.created_at,
    source: "supabase",
  };
}

export type SubmitContributionInput = Readonly<{
  buildingName: string;
  longitude: number;
  latitude: number;
  photo: File;
  gender: ContributionGender;
  access: ContributionAccess;
}>;

export async function submitContribution(
  input: SubmitContributionInput,
): Promise<Contribution> {
  const trimmed = input.buildingName.trim();
  if (trimmed.length < BUILDING_NAME_MIN) {
    throw new Error("Please enter the building name (at least 2 characters).");
  }
  if (trimmed.length > BUILDING_NAME_MAX) {
    throw new Error(
      `Building name must be ${BUILDING_NAME_MAX} characters or fewer.`,
    );
  }
  if (!isFiniteCoord(input.longitude) || !isFiniteCoord(input.latitude)) {
    throw new Error("Location is invalid. Please try again.");
  }

  const compressed = await compressImage(input.photo);
  const id = crypto.randomUUID();
  const path = `contributions/${id}.${compressed.ext}`;

  let storagePath: string | null = null;
  let photoUrl: string | null = null;
  let source: Contribution["source"] = "local";
  let createdAt = new Date().toISOString();

  try {
    const sb = getSupabase();
    const upload = await sb.storage
      .from(PHOTO_BUCKET)
      .upload(path, compressed.blob, {
        contentType: compressed.mime,
        cacheControl: "31536000",
        upsert: false,
      });
    if (upload.error) throw upload.error;
    storagePath = path;
    const { data: pub } = sb.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    photoUrl = pub.publicUrl;

    const insert = await sb
      .from(TABLE)
      .insert({
        id,
        building_name: trimmed,
        longitude: input.longitude,
        latitude: input.latitude,
        storage_path: path,
        gender: input.gender,
        access: input.access,
      })
      .select(SELECT_COLUMNS)
      .single();

    if (insert.error) {
      // Table might not exist yet (migration unapplied). Photo is safely
      // in storage already; fall through to the local-cache path so the
      // map still renders the contribution and the dev can match it up
      // by file name.
      // Surface a debug breadcrumb but don't block the user.
      console.warn(
        "[contributions] insert failed, falling back to local cache:",
        insert.error.message,
      );
    } else if (insert.data) {
      const row = insert.data as Row;
      const out = rowToContribution(row);
      appendLocalContribution(out);
      return out;
    }
    source = "local";
  } catch (err) {
    // Photo upload itself may have failed (e.g. anon-key isn't allowed
    // to write the bucket). We still want the user to see their pin —
    // persist the contribution sans photoUrl.
    console.warn("[contributions] supabase unavailable:", err);
    storagePath = null;
    photoUrl = null;
  }

  const fallback: Contribution = {
    id,
    buildingName: trimmed,
    longitude: input.longitude,
    latitude: input.latitude,
    storagePath,
    photoUrl,
    gender: input.gender,
    access: input.access,
    status: "pending",
    createdAt,
    source,
  };
  appendLocalContribution(fallback);
  return fallback;
}

// Returns the contributions the public map should render: approved
// server rows (visible to all visitors) merged with the submitter's own
// pending entries from localStorage so they see their pin immediately
// while it's awaiting review. Rejected entries from anyone are filtered
// out.
export async function fetchAllContributions(): Promise<readonly Contribution[]> {
  const local = readLocalContributions();

  let server: Contribution[] = [];
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from(TABLE)
      .select(SELECT_COLUMNS)
      .eq("status", "approved")
      .order("created_at", { ascending: true });
    if (!error && Array.isArray(data)) {
      server = (data as Row[]).map(rowToContribution);
    }
  } catch {
    // Supabase env missing or table absent — local-only mode is fine.
  }

  const seen = new Set(server.map((c) => c.id));
  for (const c of local) {
    if (c.status === "rejected") continue;
    if (!seen.has(c.id)) server.push(c);
  }
  return server;
}

function isFiniteCoord(n: number): boolean {
  return Number.isFinite(n);
}

// Admin surface helpers — separated from the public fetch path so the
// /admin page can call a dedicated server endpoint that uses the service
// role and is gated by ADMIN_TOKEN.

export type AdminContributionList = Readonly<{
  pending: readonly Contribution[];
  approved: readonly Contribution[];
}>;

export async function fetchContributionsForReview(
  adminToken: string,
): Promise<AdminContributionList> {
  const res = await fetch("/api/admin/contributions", {
    headers: { "x-admin-token": adminToken },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    data: { pending: Row[]; approved: Row[] };
  };
  return {
    pending: json.data.pending.map(rowToContribution),
    approved: json.data.approved.map(rowToContribution),
  };
}

export async function decideContribution(
  id: string,
  action: "approve" | "reject",
  adminToken: string,
): Promise<void> {
  const res = await fetch(`/api/admin/contributions/${id}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-admin-token": adminToken,
    },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `HTTP ${res.status}`);
  }
}
