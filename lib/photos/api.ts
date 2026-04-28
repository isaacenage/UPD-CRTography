import { getSupabase, PHOTO_BUCKET } from "@/lib/supabase/client";
import { compressImage } from "./compress";

export type PhotoStatus = "pending" | "approved" | "rejected";

export type BuildingPhoto = Readonly<{
  id: string;
  buildingId: number;
  storagePath: string;
  publicUrl: string;
  status: PhotoStatus;
  createdAt: string;
  approvedAt: string | null;
}>;

type Row = {
  id: string;
  building_id: number;
  storage_path: string;
  status: PhotoStatus;
  created_at: string;
  approved_at: string | null;
};

function toPhoto(row: Row): BuildingPhoto {
  const sb = getSupabase();
  const { data } = sb.storage.from(PHOTO_BUCKET).getPublicUrl(row.storage_path);
  return {
    id: row.id,
    buildingId: row.building_id,
    storagePath: row.storage_path,
    publicUrl: data.publicUrl,
    status: row.status,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
  };
}

// One approved photo per building (DB-enforced). Returns null if nobody
// has been approved yet.
export async function fetchApprovedPhoto(
  buildingId: number,
): Promise<BuildingPhoto | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("up_building_photos")
    .select("id, building_id, storage_path, status, created_at, approved_at")
    .eq("building_id", buildingId)
    .eq("status", "approved")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toPhoto(data as Row) : null;
}

export async function fetchPendingPhotos(): Promise<readonly BuildingPhoto[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("up_building_photos")
    .select("id, building_id, storage_path, status, created_at, approved_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => toPhoto(r as Row));
}

// Uploads a freshly-captured camera photo for a building. Returns the
// pending row's id so the UI can display "submitted, awaiting review".
//
// Race-condition note: if two users upload at the same moment for a
// building that the dev approves between their checks, both rows will
// land as `pending`. That's fine — the dev just picks one to approve;
// once approved, the trigger blocks any further inserts.
export async function uploadBuildingPhoto(
  buildingId: number,
  file: File,
): Promise<BuildingPhoto> {
  const sb = getSupabase();

  // Pre-flight: bail early if an approved photo already exists, so the
  // user gets a clean "already submitted" message instead of a generic
  // database error from the trigger.
  const existing = await fetchApprovedPhoto(buildingId);
  if (existing) {
    throw new Error("This building already has an approved photo.");
  }

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
    .insert({ building_id: buildingId, storage_path: path })
    .select("id, building_id, storage_path, status, created_at, approved_at")
    .single();
  if (insert.error) {
    // Best-effort cleanup so we don't leave an orphan file behind.
    await sb.storage.from(PHOTO_BUCKET).remove([path]).catch(() => {});
    throw insert.error;
  }
  return toPhoto(insert.data as Row);
}
