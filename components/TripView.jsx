// 閲覧専用の旅程表示(共有ページ用)。全日をまとめて表示、小グループは展開済み
import { CATS, catOf, fmtDate, daysBetween, timeLabel } from "../lib/tripUtils";

const C = {
  ink: "#22304A", indigoDeep: "#1D3357", line: "#B9C4D6",
  accent: "#E8A33D", sub: "#7A8699",
};

export default function TripView({ trip }) {
  const days = daysBetween(trip.start_date, trip.end_date);
  const items = trip.items || {};

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 20px 60px" }}>
      {days.map((d, di) => {
        const list = items[d] || [];
        const tops = list.filter((i) => !i.parentId);
        const childrenOf = (id) =>
          list.filter((i) => i.parentId === id); // エディタの手動並び順に合わせる
        return (
          <section key={d} style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 16, display: "flex", gap: 10, alignItems: "baseline", borderBottom: `2px solid ${C.accent}`, paddingBottom: 6 }}>
              <span style={{ color: C.accent, fontWeight: 800 }}>{di + 1}日目</span>
              <span>{fmtDate(d)}</span>
            </h2>
            {tops.length === 0 && <p style={{ color: C.sub, fontSize: 14 }}>予定なし</p>}
            <div style={{ position: "relative", paddingLeft: 6, marginTop: 14 }}>
              {tops.length > 0 && (
                <div style={{ position: "absolute", left: 21, top: 14, bottom: 8, width: 3, background: C.line, borderRadius: 2 }} />
              )}
              {tops.map((item) => {
                const cat = catOf(item.cat);
                const kids = childrenOf(item.id);
                return (
                  <div key={item.id} style={{ display: "flex", gap: 12, marginBottom: 14, position: "relative" }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#fff", border: `3px solid ${cat.color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1 }}>
                      <span style={{ fontSize: 13 }}>{cat.icon}</span>
                    </div>
                    <div style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", flex: 1, boxShadow: "0 1px 3px rgba(34,48,74,0.08)" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <strong style={{ color: cat.color, fontVariantNumeric: "tabular-nums" }}>{timeLabel(item)}</strong>
                        <span style={{ background: cat.color, color: "#fff", fontSize: 10, padding: "2px 7px", borderRadius: 999, fontWeight: 700 }}>{cat.label}</span>
                      </div>
                      <p style={{ margin: "5px 0 0", fontWeight: 700 }}>{item.title}</p>
                      {item.place && <p style={{ margin: "3px 0 0", fontSize: 13, color: C.sub }}>📍 {item.place}</p>}
                      {item.memo && <p style={{ margin: "3px 0 0", fontSize: 13, color: C.sub }}>{item.memo}</p>}
                      {kids.map((k) => {
                        const kc = catOf(k.cat);
                        return (
                          <div key={k.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 10px", marginTop: 6, background: "#F2F4F8", borderRadius: 8, borderLeft: `3px solid ${kc.color}` }}>
                            <span style={{ fontSize: 12 }}>{kc.icon}</span>
                            <strong style={{ fontSize: 13, color: kc.color, fontVariantNumeric: "tabular-nums" }}>{timeLabel(k)}</strong>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{k.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
