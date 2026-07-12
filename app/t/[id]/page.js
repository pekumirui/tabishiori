// 共有(閲覧)ページ: /t/:id
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { fmtDate, daysBetween } from "../../../lib/tripUtils";
import TripView from "../../../components/TripView";
import ShareBar from "../../../components/ShareBar";

export const dynamic = "force-dynamic";

async function getTrip(id) {
  const { data } = await supabaseAdmin
    .from("trips")
    .select("id, name, start_date, end_date, items, updated_at")
    .eq("id", id)
    .single();
  return data;
}

export async function generateMetadata({ params }) {
  const trip = await getTrip(params.id);
  if (!trip) return { title: "旅のしおり" };
  return { title: `${trip.name} | 旅のしおり` };
}

export default async function SharePage({ params }) {
  const trip = await getTrip(params.id);
  if (!trip) notFound();
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  const url = `${base}/t/${trip.id}`;
  const days = daysBetween(trip.start_date, trip.end_date);

  return (
    <div>
      <header style={{ background: "#1D3357", color: "#fff", padding: "26px 20px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <p style={{ fontSize: 11, letterSpacing: "0.25em", color: "#E8A33D", margin: "0 0 4px", fontWeight: 700 }}>旅のしおり</p>
          <h1 style={{ fontSize: 24, margin: 0, fontWeight: 800 }}>{trip.name}</h1>
          <p style={{ fontSize: 13, margin: "6px 0 0", opacity: 0.85 }}>
            {fmtDate(trip.start_date)} 〜 {fmtDate(trip.end_date)} ・ {days.length}日間
          </p>
          <div className="no-print" style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <Link href={`/t/${trip.id}/print`} style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
              🖨 印刷用ページ
            </Link>
          </div>
        </div>
      </header>
      <ShareBar url={url} title={trip.name} />
      <TripView trip={trip} />
      <footer className="no-print" style={{ textAlign: "center", padding: "24px 0 48px", fontSize: 13 }}>
        <Link href="/" style={{ color: "#2C4A7C", fontWeight: 700 }}>自分の旅のしおりを作る →</Link>
      </footer>
    </div>
  );
}
