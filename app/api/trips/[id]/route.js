// GET /api/trips/:id : 旅程を取得(公開情報のみ)
// PUT /api/trips/:id : 編集キーを検証して更新
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function GET(_req, { params }) {
  const { data, error } = await supabaseAdmin
    .from("trips")
    .select("id, name, start_date, end_date, step_min, auto_recalc, items, updated_at")
    .eq("id", params.id)
    .single();
  if (error || !data) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(req, { params }) {
  const body = await req.json().catch(() => null);
  if (!body?.editKey) return NextResponse.json({ error: "編集キーがありません" }, { status: 401 });

  const { data: row } = await supabaseAdmin
    .from("trips")
    .select("edit_key")
    .eq("id", params.id)
    .single();
  if (!row) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  if (row.edit_key !== body.editKey)
    return NextResponse.json({ error: "編集権限がありません" }, { status: 403 });

  const patch = { updated_at: new Date().toISOString() };
  if (body.name != null) patch.name = String(body.name).slice(0, 100);
  if (body.start != null) patch.start_date = body.start;
  if (body.end != null) patch.end_date = body.end;
  if (body.stepMin != null) patch.step_min = body.stepMin;
  if (body.autoRecalc != null) patch.auto_recalc = !!body.autoRecalc;
  if (body.items != null) patch.items = body.items;

  const { error } = await supabaseAdmin.from("trips").update(patch).eq("id", params.id);
  if (error) {
    console.error(error);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
