import { getSupabase, PHOTO_BUCKET } from "@/lib/supabase/client";
import type { BuildingPhoto } from "./api";

export type ReportStatus = "open" | "resolved";

export type PhotoReport = Readonly<{
  id: string;
  photoId: string;
  comment: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  // The associated photo, joined in a single query so the admin UI can
  // render each report next to its target image without a follow-up
  // round-trip.
  photo: BuildingPhoto;
}>;

export const REPORT_COMMENT_MIN = 2;
export const REPORT_COMMENT_MAX = 500;

type ReportRow = {
  id: string;
  photo_id: string;
  comment: string;
  status: ReportStatus;
  created_at: string;
  resolved_at: string | null;
  up_building_photos: {
    id: string;
    building_id: number;
    storage_path: string;
    description: string;
    status: "pending" | "approved" | "rejected";
    created_at: string;
    approved_at: string | null;
  } | null;
};

const REPORT_SELECT =
  "id, photo_id, comment, status, created_at, resolved_at, " +
  "up_building_photos!inner(" +
  "id, building_id, storage_path, description, status, created_at, approved_at" +
  ")";

function toReport(row: ReportRow): PhotoReport | null {
  const photoRow = row.up_building_photos;
  if (!photoRow) return null;
  const sb = getSupabase();
  const { data: urlData } = sb.storage
    .from(PHOTO_BUCKET)
    .getPublicUrl(photoRow.storage_path);
  const photo: BuildingPhoto = {
    id: photoRow.id,
    buildingId: photoRow.building_id,
    storagePath: photoRow.storage_path,
    publicUrl: urlData.publicUrl,
    description: photoRow.description,
    status: photoRow.status,
    createdAt: photoRow.created_at,
    approvedAt: photoRow.approved_at,
  };
  return {
    id: row.id,
    photoId: row.photo_id,
    comment: row.comment,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    photo,
  };
}

// Submits one report per selected photo, sharing the same user-typed
// comment. Multi-row insert in a single round-trip; if the DB rejects
// any row (e.g. comment trimmed below 2 chars) the whole batch fails.
export async function submitPhotoReports(
  photoIds: readonly string[],
  comment: string,
): Promise<void> {
  const trimmed = comment.trim();
  if (trimmed.length < REPORT_COMMENT_MIN) {
    throw new Error("Please add a short comment about the issue.");
  }
  if (trimmed.length > REPORT_COMMENT_MAX) {
    throw new Error(`Comment must be ${REPORT_COMMENT_MAX} characters or fewer.`);
  }
  if (photoIds.length === 0) {
    throw new Error("Please pick at least one photo to report.");
  }

  const sb = getSupabase();
  const rows = photoIds.map((id) => ({ photo_id: id, comment: trimmed }));
  const { error } = await sb.from("up_photo_reports").insert(rows);
  if (error) throw error;
}

export async function fetchOpenReports(): Promise<readonly PhotoReport[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("up_photo_reports")
    .select(REPORT_SELECT)
    .eq("status", "open")
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as unknown as ReportRow[];
  return rows
    .map((r) => toReport(r))
    .filter((r): r is PhotoReport => r !== null);
}
