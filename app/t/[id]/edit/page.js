"use client";
// 編集ページ: /t/:id/edit
// 編集キーは localStorage("editKey:{id}") または URLの ?key= から取得
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Editor from "../../../../components/Editor";

export default function EditPage() {
  const { id } = useParams();
  const search = useSearchParams();
  const [trip, setTrip] = useState(null);
  const [editKeyValue, setEditKeyValue] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | notfound | nokey

  useEffect(() => {
    (async () => {
      // 編集キーの取得(URL優先、無ければ端末保存分)
      const urlKey = search.get("key");
      const storedKey = localStorage.getItem(`editKey:${id}`);
      const key = urlKey || storedKey;
      if (urlKey && urlKey !== storedKey) localStorage.setItem(`editKey:${id}`, urlKey);

      const res = await fetch(`/api/trips/${id}`);
      if (!res.ok) {
        setState("notfound");
        return;
      }
      const data = await res.json();
      if (!key) {
        setState("nokey");
        return;
      }
      setEditKeyValue(key);
      // サーバーの形 → エディタの形 に変換
      setTrip({
        name: data.name,
        start: data.start_date,
        end: data.end_date,
        stepMin: data.step_min || 15,
        autoRecalc: !!data.auto_recalc,
        items: data.items || {},
      });
      setState("ready");
    })();
  }, [id, search]);

  if (state === "loading")
    return <p style={{ textAlign: "center", padding: 60, color: "#7A8699" }}>読み込み中…</p>;
  if (state === "notfound")
    return <p style={{ textAlign: "center", padding: 60 }}>この旅程は見つかりませんでした。</p>;
  if (state === "nokey")
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <p>このしおりの編集キーがこの端末にありません。</p>
        <p style={{ fontSize: 13, color: "#7A8699" }}>
          作成した端末で開くか、編集用URL(?key=付き)からアクセスしてください。
          <br />
          閲覧は <a href={`/t/${id}`} style={{ color: "#2C4A7C", fontWeight: 700 }}>共有ページ</a> からどうぞ。
        </p>
      </div>
    );

  return <Editor initialTrip={trip} tripId={id} editKeyValue={editKeyValue} />;
}
