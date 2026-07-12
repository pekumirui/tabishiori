// 印刷用ページ: /t/:id/print (1日1ページで改ページ、小グループ展開)
import { notFound } from "next/navigation";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { catOf, fmtDate, daysBetween, timeLabel } from "../../../../lib/tripUtils";
import PrintButton from "../../../../components/PrintButton";

export const dynamic = "force-dynamic";

export default async function PrintPage({ params }) {
  const { data: trip } = await supabaseAdmin
    .from("trips")
    .select("id, name, start_date, end_date, items")
    .eq("id", params.id)
    .single();
  if (!trip) notFound();

  const days = daysBetween(trip.start_date, trip.end_date);
  const items = trip.items || {};

  return (
    <div style={{ background: "#fff", minHeight: "100vh", color: "#22304A" }}>
      <PrintButton />
      {days.map((d, di) => {
        const list = items[d] || [];
        const tops = list.filter((i) => !i.parentId);
        const childrenOf = (id) =>
          list.filter((i) => i.parentId === id).sort((a, b) => a.time.localeCompare(b.time));
        return (
          <div key={d} className="print-day" style={{ maxWidth: 640, margin: "0 auto", padding: "36px 28px" }}>
            <p style={{ fontSize: 11, letterSpacing: "0.25em", color: "#B08A3E", margin: 0, fontWeight: 700 }}>旅のしおり</p>
            <h1 style={{ fontSize: 20, margin: "2px 0 0" }}>{trip.name}</h1>
            <h2 style={{ fontSize: 15, margin: "14px 0 0", borderBottom: "2px solid #22304A", paddingBottom: 6 }}>
              {di + 1}日目 {fmtDate(d)}
            </h2>
            {tops.length === 0 && <p style={{ fontSize: 13, color: "#7A8699" }}>予定なし</p>}
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10, fontSize: 13 }}>
              <tbody>
                {tops.map((item) => {
                  const kids = childrenOf(item.id);
                  const cat = catOf(item.cat);
                  return [
                    <tr key={item.id} style={{ borderBottom: kids.length ? "none" : "1px solid #DDD" }}>
                      <td style={{ padding: "8px 8px 8px 0", whiteSpace: "nowrap", fontWeight: 700, width: 110, verticalAlign: "top", fontVariantNumeric: "tabular-nums" }}>
                        {timeLabel(item)}
                      </td>
                      <td style={{ padding: "8px 0", verticalAlign: "top" }}>
                        <span style={{ marginRight: 6 }}>{cat.icon}</span>
                        <strong>{item.title}</strong>
                        {item.place && <span style={{ color: "#555" }}> ── {item.place}</span>}
                        {item.memo && <div style={{ color: "#555", marginTop: 2 }}>{item.memo}</div>}
                      </td>
                    </tr>,
                    ...kids.map((k, ki) => (
                      <tr key={k.id} style={{ borderBottom: ki === kids.length - 1 ? "1px solid #DDD" : "none" }}>
                        <td style={{ padding: "3px 8px 3px 16px", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", color: "#444" }}>
                          └ {timeLabel(k)}
                        </td>
                        <td style={{ padding: "3px 0", color: "#444" }}>
                          {catOf(k.cat).icon} {k.title}
                          {k.memo && <span style={{ color: "#777" }}>({k.memo})</span>}
                        </td>
                      </tr>
                    )),
                  ];
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
