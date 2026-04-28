import { NextResponse } from "next/server";
import { checkAdminToken, getServiceSupabase } from "@/lib/supabase/admin";
import { PHOTO_BUCKET } from "@/lib/supabase/client";

export const runtime = "nodejs";
// This route reads the request token and writes to the database, so static
// generation isn't possible — force dynamic.
export const dynamic = "force-dynamic";

type Action = "approve" | "reject";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const token = req.headers.get("x-admin-token");
  if (!checkAdminToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { action?: Action } = {};
  try {
    body = (await req.json()) as { action?: Action };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const action = body.action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be approve|reject" }, { status: 400 });
  }

  const sb = getServiceSupabase();

  if (action === "approve") {
    // Block approving when another approved photo already exists for the
    // same building. Without this, the partial unique index would 23505
    // and we'd return a generic Postgres error.
    const target = await sb
      .from("up_building_photos")
      .select("id, building_id, status")
      .eq("id", id)
      .maybeSingle();
    if (target.error) {
      return NextResponse.json({ error: target.error.message }, { status: 500 });
    }
    if (!target.data) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }
    const existing = await sb
      .from("up_building_photos")
      .select("id")
      .eq("building_id", target.data.building_id)
      .eq("status", "approved")
      .neq("id", id)
      .limit(1);
    if (existing.error) {
      return NextResponse.json({ error: existing.error.message }, { status: 500 });
    }
    if (existing.data && existing.data.length > 0) {
      return NextResponse.json(
        { error: "This building already has an approved photo." },
        { status: 409 },
      );
    }
    const { data, error } = await sb
      .from("up_building_photos")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, building_id, storage_path, status, approved_at")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  }

  // reject: drop the row + remove the storage object.
  const target = await sb
    .from("up_building_photos")
    .select("id, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (target.error) {
    return NextResponse.json({ error: target.error.message }, { status: 500 });
  }
  if (!target.data) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const del = await sb.from("up_building_photos").delete().eq("id", id);
  if (del.error) {
    return NextResponse.json({ error: del.error.message }, { status: 500 });
  }
  // Best-effort storage cleanup. Failure here doesn't break the reject —
  // the row is already gone and the orphan can be swept later.
  await sb.storage.from(PHOTO_BUCKET).remove([target.data.storage_path]).catch(() => {});

  return NextResponse.json({ data: { id, status: "rejected" } });
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
