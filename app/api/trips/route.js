// POST /api/trips : 新しい旅程を作成
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { shortId, editKey } from "../../../lib/id";

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.start || !body?.end) {
    return NextResponse.json({ error: "name, start, end は必須です" }, { status: 400 });
  }
  const id = shortId();
  const key = editKey();
  const { error } = await supabaseAdmin.from("trips").insert({
    id,
    edit_key: key,
    name: String(body.name).slice(0, 100),
    start_date: body.start,
    end_date: body.end,
    step_min: 15,
    auto_recalc: false,
    items: {},
  });
  if (error) {
    console.error(error);
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
  return NextResponse.json({ id, editKey: key });
}
