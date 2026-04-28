import { NextResponse } from "next/server";
import { checkAdminToken, getServiceSupabase } from "@/lib/supabase/admin";
import { CONTRIBUTIONS_TABLE } from "@/lib/contributions/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SELECT_COLUMNS =
  "id, building_name, longitude, latitude, storage_path, gender, access, status, created_at";

// Service-role read of the contributions table so the dev sees pending
// and recently-approved entries regardless of RLS state. Returns two
// buckets so the admin UI can render Inbox-style and audit views from
// one round-trip.
export async function GET(req: Request) {
  const token = req.headers.get("x-admin-token");
  if (!checkAdminToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from(CONTRIBUTIONS_TABLE)
    .select(SELECT_COLUMNS)
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: true });

  if (error) {
    // Most common reason this fails: the migration hasn't been applied
    // yet so the table doesn't exist. Surface a clear message instead of
    // a generic 500.
    return NextResponse.json(
      {
        error:
          error.message +
          " — make sure the up_user_contributions table is created.",
      },
      { status: 500 },
    );
  }

  type Row = {
    id: string;
    building_name: string;
    longitude: number;
    latitude: number;
    storage_path: string | null;
    gender: string;
    access: string;
    status: "pending" | "approved" | "rejected";
    created_at: string;
  };

  const rows = (data ?? []) as Row[];
  const pending = rows.filter((r) => r.status === "pending");
  const approved = rows.filter((r) => r.status === "approved");

  return NextResponse.json({ data: { pending, approved } });
}
