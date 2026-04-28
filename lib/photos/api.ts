import { getSupabase, PHOTO_BUCKET } from "@/lib/supabase/client";
import { compressImage } from "./compress";

export type PhotoStatus = "pending" | "approved" | "rejected";

export type BuildingPhoto = Readonly<{
  id: string;
  buildingId: number;
  storagePath: string;
  publicUrl: string;
  description: string;
  status: PhotoStatus;
  createdAt: string;
  approvedAt: string | null;
}>;

// Mirrors the constraint enforced by the database
// (`length(btrim(description)) between 2 and 160`). Kept in sync so the
// client errors before a round-trip when a caption is empty / too long.
export const DESCRIPTION_MIN = 2;
export const DESCRIPTION_MAX = 160;

type Row = {
  id: string;
  building_id: number;
  storage_path: string;
  description: string;
  status: PhotoStatus;
  created_at: string;
  approved_at: string | null;
};

const SELECT_COLUMNS =
  "id, building_id, storage_path, description, status, created_at, approved_at";

function toPhoto(row: Row): BuildingPhoto {
  const sb = getSupabase();
  const { data } = sb.storage.from(PHOTO_BUCKET).getPublicUrl(row.storage_path);
  return {
    id: row.id,
    buildingId: row.building_id,
    storagePath: row.storage_path,
    publicUrl: data.publicUrl,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
  };
}

export async function fetchApprovedPhotos(
  buildingId: number,
): Promise<readonly BuildingPhoto[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("up_building_photos")
    .select(SELECT_COLUMNS)
    .eq("building_id", buildingId)
    .eq("status", "approved")
    .order("approved_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => toPhoto(r as Row));
}

export type PhotosByBuilding = ReadonlyMap<
  number,
  Readonly<{ approved: readonly BuildingPhoto[]; pending: readonly BuildingPhoto[] }>
>;

// Single round-trip used by /admin to render approved + pending sections,
// grouped by building. Returns an ordered Map (insertion-ordered by
// building_id ascending) so the UI doesn't need to re-sort.
export async function fetchPhotosForReview(): Promise<PhotosByBuilding> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("up_building_photos")
    .select(SELECT_COLUMNS)
    .in("status", ["approved", "pending"])
    .order("building_id", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;

  const grouped = new Map<
    number,
    { approved: BuildingPhoto[]; pending: BuildingPhoto[] }
  >();
  for (const row of data ?? []) {
    const photo = toPhoto(row as Row);
    let bucket = grouped.get(photo.buildingId);
    if (!bucket) {
      bucket = { approved: [], pending: [] };
      grouped.set(photo.buildingId, bucket);
    }
    if (photo.status === "approved") bucket.approved.push(photo);
    else if (photo.status === "pending") bucket.pending.push(photo);
  }
  return grouped;
}

// Uploads a freshly-captured camera photo for a building. The caller
// must supply a description (e.g. "2nd Floor Women's CR"); empty values
// are rejected by both the DB check and the input validator below.
//
// Returns the inserted row so the UI can confirm submission. Buildings
// can host multiple approved photos — one per CR / location — so we no
// longer pre-flight against an existing approval.
export async function uploadBuildingPhoto(
  buildingId: number,
  file: File,
  description: string,
): Promise<BuildingPhoto> {
  const trimmed = description.trim();
  if (trimmed.length < DESCRIPTION_MIN) {
    throw new Error("Please describe where in the building this photo was taken.");
  }
  if (trimmed.length > DESCRIPTION_MAX) {
    throw new Error(`Description must be ${DESCRIPTION_MAX} characters or fewer.`);
  }

  const sb = getSupabase();
  const compressed = await compressImage(file);
  const path = `b${buildingId}/${crypto.randomUUID()}.${compressed.ext}`;

  const upload = await sb.storage
    .from(PHOTO_BUCKET)
    .upload(path, compressed.blob, {
      contentType: compressed.mime,
      cacheControl: "31536000",
      upsert: false,
    });
  if (upload.error) throw upload.error;

  const insert = await sb
    .from("up_building_photos")
    .insert({
      building_id: buildingId,
      storage_path: path,
      description: trimmed,
    })
    .select(SELECT_COLUMNS)
    .single();
  if (insert.error) {
    // Best-effort cleanup so we don't leave an orphan file behind.
    await sb.storage.from(PHOTO_BUCKET).remove([path]).catch(() => {});
    throw insert.error;
  }
  return toPhoto(insert.data as Row);
}
