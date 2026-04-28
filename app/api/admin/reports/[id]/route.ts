import { NextResponse } from "next/server";
import { checkAdminToken, getServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "Retain" marks a report as resolved while keeping the underlying
// photo published. To delete the photo (and cascade-delete the report
// rows), the admin UI calls /api/admin/photos/[id] with action=reject
// instead — that path already handles storage cleanup.

type Action = "retain";

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
  if (body.action !== "retain") {
    return NextResponse.json({ error: "action must be retain" }, { status: 400 });
  }

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from("up_photo_reports")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, status, resolved_at")
    .single();
  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json({ data });
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
