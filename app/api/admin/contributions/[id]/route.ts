import { NextResponse } from "next/server";
import { checkAdminToken, getServiceSupabase } from "@/lib/supabase/admin";
import { PHOTO_BUCKET } from "@/lib/supabase/client";
import { CONTRIBUTIONS_TABLE } from "@/lib/contributions/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Approve flips the row to status='approved' so the public map renders
// it for everyone. Reject deletes the row and removes the associated
// storage object so a troll submission doesn't linger.

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
    return NextResponse.json(
      { error: "action must be approve|reject" },
      { status: 400 },
    );
  }

  const sb = getServiceSupabase();

  if (action === "approve") {
    const { data, error } = await sb
      .from(CONTRIBUTIONS_TABLE)
      .update({ status: "approved" })
      .eq("id", id)
      .select("id, status")
      .single();
    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ data });
  }

  // Reject: read storage_path so we can clean up the photo, then delete.
  const target = await sb
    .from(CONTRIBUTIONS_TABLE)
    .select("id, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (target.error) {
    return NextResponse.json({ error: target.error.message }, { status: 500 });
  }
  if (!target.data) {
    return NextResponse.json({ error: "Contribution not found" }, { status: 404 });
  }

  const del = await sb.from(CONTRIBUTIONS_TABLE).delete().eq("id", id);
  if (del.error) {
    return NextResponse.json({ error: del.error.message }, { status: 500 });
  }
  if (target.data.storage_path) {
    await sb.storage
      .from(PHOTO_BUCKET)
      .remove([target.data.storage_path])
      .catch(() => {});
  }

  return NextResponse.json({ data: { id, status: "rejected" } });
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
