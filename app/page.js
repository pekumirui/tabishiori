"use client";
// トップページ: 新規作成 + 自分のしおり一覧(この端末で作ったもの)
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const C = { ink: "#22304A", indigo: "#2C4A7C", indigoDeep: "#1D3357", line: "#B9C4D6", accent: "#E8A33D", sub: "#7A8699", danger: "#C25450" };

const toYMD = (dt) => {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function Home() {
  const router = useRouter();
  const today = toYMD(new Date());
  const [name, setName] = useState("");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [mine, setMine] = useState([]);

  useEffect(() => {
    try {
      setMine(JSON.parse(localStorage.getItem("myTrips") || "[]"));
    } catch {}
  }, []);

  const valid = name.trim() && start && end && start <= end;

  const create = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), start, end }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "作成に失敗しました");
      // 編集キーをこの端末に保存
      localStorage.setItem(`editKey:${data.id}`, data.editKey);
      const list = JSON.parse(localStorage.getItem("myTrips") || "[]");
      list.unshift({ id: data.id, name: name.trim(), start, end });
      localStorage.setItem("myTrips", JSON.stringify(list.slice(0, 30)));
      router.push(`/t/${data.id}/edit`);
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };

  const S = {
    input: { width: "100%", border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 15, background: "#fff", color: C.ink },
    label: { display: "block", fontSize: 12, fontWeight: 700, color: C.sub, margin: "12px 0 4px" },
  };

  return (
    <main style={{ maxWidth: 440, margin: "0 auto", padding: "56px 20px" }}>
      <p style={{ fontSize: 11, letterSpacing: "0.25em", color: C.accent, margin: 0, fontWeight: 700 }}>旅のしおり</p>
      <h1 style={{ fontSize: 26, margin: "4px 0 6px", fontWeight: 800 }}>新しい旅をつくる</h1>
      <p style={{ color: C.sub, fontSize: 14, margin: "0 0 24px" }}>
        日程を組み立てて、URLひとつで共有・印刷できます。登録不要。
      </p>

      <label style={S.label}>旅の名前</label>
      <input style={S.input} placeholder="例:京都ふたり旅" value={name} onChange={(e) => setName(e.target.value)} />
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>出発日</label>
          <input type="date" style={S.input} value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>帰着日</label>
          <input type="date" style={S.input} value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      {start > end && <p style={{ color: C.danger, fontSize: 13 }}>帰着日は出発日より後にしてください。</p>}
      {err && <p style={{ color: C.danger, fontSize: 13 }}>{err}</p>}
      <button
        onClick={create}
        disabled={!valid || busy}
        style={{ width: "100%", marginTop: 20, background: C.indigo, color: "#fff", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: valid && !busy ? 1 : 0.4 }}
      >
        {busy ? "作成中…" : "しおりを作成"}
      </button>

      {mine.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 14, color: C.sub }}>この端末で作ったしおり</h2>
          {mine.map((t) => (
            <a
              key={t.id}
              href={`/t/${t.id}/edit`}
              style={{ display: "block", background: "#fff", borderRadius: 10, padding: "12px 14px", marginTop: 8, textDecoration: "none", boxShadow: "0 1px 3px rgba(34,48,74,0.08)" }}
            >
              <strong>{t.name}</strong>
              <span style={{ fontSize: 12, color: C.sub, marginLeft: 8 }}>{t.start} 〜 {t.end}</span>
            </a>
          ))}
        </section>
      )}
    </main>
  );
}
