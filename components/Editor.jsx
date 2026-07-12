"use client";
import { useState, useEffect, useRef } from "react";

// ---- デザイントークン ----
const C = {
  bg: "#F7F6F2",
  ink: "#22304A",
  indigo: "#2C4A7C",
  indigoDeep: "#1D3357",
  line: "#B9C4D6",
  accent: "#E8A33D",
  card: "#FFFFFF",
  sub: "#7A8699",
  danger: "#C25450",
};

const CATS = [
  { id: "move", label: "移動", icon: "🚃", color: "#2C4A7C" },
  { id: "sight", label: "観光", icon: "⛩️", color: "#4A7C59" },
  { id: "food", label: "食事", icon: "🍜", color: "#C2703E" },
  { id: "stay", label: "宿泊", icon: "🏨", color: "#6B5B95" },
  { id: "area", label: "エリア", icon: "🗺️", color: "#3E7C8A" },
  { id: "other", label: "その他", icon: "📌", color: "#7A8699" },
];

const STEPS = [1, 5, 15, 30, 60];

const toYMD = (dt) => {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const fmtDate = (d) => {
  const dt = new Date(d + "T00:00:00");
  const w = ["日", "月", "火", "水", "木", "金", "土"][dt.getDay()];
  return `${dt.getMonth() + 1}/${dt.getDate()}(${w})`;
};

const daysBetween = (start, end) => {
  const out = [];
  let cur = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (cur <= last && out.length < 30) {
    out.push(toYMD(cur));
    cur = new Date(cur.getTime() + 86400000);
  }
  return out;
};

const timeLabel = (item) =>
  item.endTime ? `${item.time}-${item.endTime}` : item.time;

const addHour = (t) => {
  const [h, m] = t.split(":").map(Number);
  return `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const snapTime = (t, step) => {
  const [h, m] = t.split(":").map(Number);
  const total = Math.round((h * 60 + m) / step) * step;
  const hh = Math.min(Math.floor(total / 60), 23);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

const suggestNextTime = (items, step) => {
  if (!items || items.length === 0) return "09:00";
  const latest = items.reduce((a, b) =>
    (b.endTime || b.time) > (a.endTime || a.time) ? b : a
  );
  return snapTime(latest.endTime || addHour(latest.time), step);
};

// "HH:MM" -> 分, 分 -> "HH:MM"
const toMin = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const toHM = (min) => {
  const clamped = Math.max(0, Math.min(min, 23 * 60 + 59));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
};

// 予定の所要時間(分)。終了がなければ0扱い
const durationOf = (it) => (it.endTime ? Math.max(0, toMin(it.endTime) - toMin(it.time)) : 0);

// 並べ替え後、所要時間(予定ごと)と空き(スロット間)を保ったまま先頭から前詰めで振り直す。
// 中の予定は、親の開始が動いた分だけ一緒にずらす(長さは維持)。
const recalcTimes = (dayList, origTops) => {
  const tops = dayList.filter((i) => !i.parentId);
  const kids = dayList.filter((i) => i.parentId);
  if (tops.length === 0) return dayList;

  // スロット間の空き列を、並べ替え前の順序から求める(位置に属する)
  // gaps[i] = 元の順序での i番目の終わり → i+1番目の始まり の空き
  const gaps = [];
  for (let i = 0; i < origTops.length - 1; i++) {
    const curEnd = origTops[i].endTime ? toMin(origTops[i].endTime) : toMin(origTops[i].time);
    const nextStart = toMin(origTops[i + 1].time);
    gaps.push(Math.max(0, nextStart - curEnd));
  }

  const patched = {};
  let cursor = toMin(origTops[0].time); // 先頭スロットの開始時刻は据え置き

  tops.forEach((it, idx) => {
    const dur = durationOf(it);
    const origStart = toMin(it.time);
    const newStart = cursor;
    const newEnd = newStart + dur;
    const shift = newStart - origStart;

    patched[it.id] = {
      time: toHM(newStart),
      endTime: it.endTime ? toHM(newEnd) : it.endTime,
    };

    kids
      .filter((k) => k.parentId === it.id)
      .forEach((k) => {
        const ks = toMin(k.time) + shift;
        const ke = k.endTime ? toMin(k.endTime) + shift : null;
        patched[k.id] = { time: toHM(ks), endTime: ke != null ? toHM(ke) : k.endTime };
      });

    cursor = newEnd + (gaps[idx] || 0);
  });

  return dayList.map((it) => (patched[it.id] ? { ...it, ...patched[it.id] } : it));
};

// ---- 自前の時刻ピッカー(分は刻み設定に従う) ----
function TimeSelect({ value, step, onChange, allowEmpty }) {
  const hours = [...Array(24).keys()];
  const mins = [];
  for (let m = 0; m < 60; m += step) mins.push(m);
  const [h, m] = value ? value.split(":").map(Number) : [null, null];
  // 既存データが刻みに合わない場合はその値も選択肢に含める(勝手に変えない)
  const minsList = m != null && !mins.includes(m) ? [...mins, m].sort((a, b) => a - b) : mins;
  const emit = (nh, nm) =>
    onChange(`${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`);
  return (
    <span style={{ display: "inline-flex", gap: 2, alignItems: "center" }}>
      <select
        style={S.timeSel}
        value={h ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "") onChange("");
          else emit(Number(v), m ?? 0);
        }}
      >
        {allowEmpty && <option value="">--</option>}
        {hours.map((x) => (
          <option key={x} value={x}>{String(x).padStart(2, "0")}</option>
        ))}
      </select>
      <span style={{ fontWeight: 700 }}>:</span>
      <select
        style={S.timeSel}
        value={m ?? ""}
        disabled={h == null}
        onChange={(e) => emit(h ?? 9, Number(e.target.value))}
      >
        {h == null && <option value="">--</option>}
        {minsList.map((x) => (
          <option key={x} value={x}>{String(x).padStart(2, "0")}</option>
        ))}
      </select>
    </span>
  );
}

export default function Editor({ initialTrip, tripId, editKeyValue }) {
  const [trip, setTrip] = useState(initialTrip);
  const [saveState, setSaveState] = useState("saved"); // saved | saving | error
  const [activeDay, setActiveDay] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [expanded, setExpanded] = useState({});

  const [quickOpen, setQuickOpen] = useState(false);
  const [qTime, setQTime] = useState("09:00");
  const [qEnd, setQEnd] = useState("");
  const [qTitle, setQTitle] = useState("");
  const [qCat, setQCat] = useState("sight");

  const [cqParent, setCqParent] = useState(null);
  const [cqTime, setCqTime] = useState("09:00");
  const [cqEnd, setCqEnd] = useState("");
  const [cqTitle, setCqTitle] = useState("");
  const [cqCat, setCqCat] = useState("sight");

  const [editId, setEditId] = useState(null);
  const [eTime, setETime] = useState("09:00");
  const [eEnd, setEEnd] = useState("");

  // 予定全体の編集(詳細フォーム)
  const [editFullItem, setEditFullItem] = useState(null);

  // ドラッグ並べ替え(windowでイベントを追跡する方式)
  const [dragId, setDragId] = useState(null);
  const rowRefs = useRef({}); // id -> element
  const dayRef = useRef(null);

  // 入力欄が新しく現れたとき、ブラウザが自動でフォーカスするのを打ち消す
  // (フォーカスが入るとスマホでキーボードが出て画面が動くため)
  // 描画確定後に一度だけ実行。手動タップはこの後の操作なので影響しない
  useEffect(() => {
    if (quickOpen || cqParent) {
      requestAnimationFrame(() => {
        const el = document.activeElement;
        if (el && el.tagName === "INPUT" && el.dataset.title === "1") el.blur();
      });
    }
  }, [quickOpen, cqParent]);

  // サーバー保存(800msデバウンス)。連続操作中は最後の状態だけ送る
  const saveTimer = useRef(null);
  const persist = (t) => {
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/trips/${tripId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            editKey: editKeyValue,
            name: t.name,
            start: t.start,
            end: t.end,
            stepMin: t.stepMin,
            autoRecalc: t.autoRecalc,
            items: t.items,
          }),
        });
        if (!res.ok) throw new Error();
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 800);
  };

  const save = (t) => {
    setTrip(t);
    persist(t);
  };

  const step = trip?.stepMin || 15;

  const addItem = (date, item) => {
    const list = trip.items[date] || [];
    const newIt = { ...item, id: Date.now() };
    let newList;
    if (item.parentId) {
      newList = [...list, newIt];
    } else {
      const tops = list.filter((i) => !i.parentId);
      const kids = list.filter((i) => i.parentId);
      let pos = tops.findIndex((t) => t.time > item.time);
      if (pos === -1) pos = tops.length;
      tops.splice(pos, 0, newIt);
      newList = [...tops, ...kids];
    }
    save({ ...trip, items: { ...trip.items, [date]: newList } });
    if (item.parentId) setExpanded((p) => ({ ...p, [item.parentId]: true }));
  };

  const updateItem = (date, id, patch) => {
    const list = trip.items[date] || [];
    save({
      ...trip,
      items: { ...trip.items, [date]: list.map((i) => (i.id === id ? { ...i, ...patch } : i)) },
    });
  };

  const removeItem = (date, id) => {
    const list = trip.items[date] || [];
    const children = list.filter((i) => i.parentId === id);
    if (children.length > 0) {
      if (!confirm(`このグループの中の${children.length}件の予定も一緒に削除されます。よろしいですか?`))
        return;
    }
    save({
      ...trip,
      items: { ...trip.items, [date]: list.filter((i) => i.id !== id && i.parentId !== id) },
    });
  };

  const days = daysBetween(trip.start, trip.end);
  const day = days[Math.min(activeDay, days.length - 1)];
  dayRef.current = day;
  const dayItems = trip.items[day] || [];
  const topItems = dayItems.filter((i) => !i.parentId);
  const childrenOf = (id) => dayItems.filter((i) => i.parentId === id); // 並び順は配列順(手動)

  // ---- ドラッグ: ハンドルを押したらwindowで追跡。要素が入れ替わっても途切れない ----
  // ---- 長押しでドラッグ開始 ----
  // カードのどこでも400ms長押しで並べ替えモードに入る。
  // 長押し前に指が8px以上動いたら「スクロールしたいだけ」と判断して発動しない。
  const pressRef = useRef(null);
  const draggedRef = useRef(false); // ドラッグ直後のタップ(開閉)を無効化するため

  const pressStart = (e, id, parentId = null) => {
    // ボタンや入力欄の長押しでは発動させない
    if (e.target.closest("button, input, select, a")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const sx = e.clientX, sy = e.clientY;

    const cancel = () => {
      if (pressRef.current) clearTimeout(pressRef.current.timer);
      pressRef.current = null;
      window.removeEventListener("pointermove", onPreMove);
      window.removeEventListener("pointerup", onPreUp);
      window.removeEventListener("pointercancel", onPreUp);
    };
    const onPreMove = (ev) => {
      if (Math.abs(ev.clientX - sx) > 8 || Math.abs(ev.clientY - sy) > 8) cancel();
    };
    const onPreUp = () => cancel();

    window.addEventListener("pointermove", onPreMove);
    window.addEventListener("pointerup", onPreUp);
    window.addEventListener("pointercancel", onPreUp);
    pressRef.current = {
      timer: setTimeout(() => {
        cancel();
        beginSort(id, parentId);
      }, 400),
    };
  };

  const beginSort = (id, parentId) => {
    setDragId(id);
    draggedRef.current = true;
    document.body.style.userSelect = "none";

    // 再計算用: ドラッグ開始時点の「時刻順スロット列」を記録(空きの並びの基準)
    const startList = trip.items[dayRef.current] || [];
    const origTops = startList
      .filter((i) => !i.parentId)
      .slice()
      .sort((a, b) => a.time.localeCompare(b.time));

    // 同じ階層(トップ同士/同じ親の子同士)の中で、指のY位置に応じて並べ替える
    const reorderByY = (y) => {
      setTrip((t) => {
        const d = dayRef.current;
        const list = t.items[d] || [];
        const sibs = parentId
          ? list.filter((i) => i.parentId === parentId)
          : list.filter((i) => !i.parentId);
        const cur = sibs.findIndex((i) => i.id === id);
        if (cur < 0) return t;

        let target = cur;
        for (let i = 0; i < sibs.length; i++) {
          const el = rowRefs.current[sibs[i].id];
          if (!el) continue;
          const r = el.getBoundingClientRect();
          if (y > r.top + r.height / 2) target = i;
        }
        const firstEl = rowRefs.current[sibs[0]?.id];
        if (firstEl) {
          const fr = firstEl.getBoundingClientRect();
          if (y < fr.top + fr.height / 2) target = 0;
        }

        if (target === cur) return t;
        const arr = sibs.slice();
        const [m] = arr.splice(cur, 1);
        arr.splice(target, 0, m);

        let newList;
        if (parentId) {
          // 兄弟の位置だけ新しい順序で差し替える(他の要素は元の位置のまま)
          let k = 0;
          newList = list.map((i) => (i.parentId === parentId ? arr[k++] : i));
        } else {
          newList = [...arr, ...list.filter((i) => i.parentId)];
        }
        return { ...t, items: { ...t.items, [d]: newList } };
      });
    };

    // ドラッグ中は画面スクロールを止める(発動後に付けるので通常スクロールは阻害しない)
    const blockScroll = (ev) => ev.preventDefault();
    const onMove = (ev) => reorderByY(ev.clientY);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("touchmove", blockScroll);
      document.body.style.userSelect = "";
      setDragId(null);
      setTrip((t) => {
        const d = dayRef.current;
        let next = t;
        // 時刻の自動詰め直しはトップレベルの並べ替え時のみ
        if (!parentId && t.autoRecalc) {
          const recalculated = recalcTimes(t.items[d] || [], origTops);
          next = { ...t, items: { ...t.items, [d]: recalculated } };
        }
        persist(next);
        return next;
      });
    };
    window.addEventListener("touchmove", blockScroll, { passive: false });
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const openQuick = () => {
    setQTime(suggestNextTime(dayItems, step));
    setQEnd("");
    setQTitle("");
    setQuickOpen(true);
  };
  const submitQuick = () => {
    if (!qTitle.trim()) return;
    addItem(day, { time: qTime, endTime: qEnd || null, title: qTitle.trim(), place: "", memo: "", cat: qCat, parentId: null });
    setQuickOpen(false);
  };

  const openChildQuick = (parent) => {
    const sibs = childrenOf(parent.id);
    setCqTime(sibs.length ? suggestNextTime(sibs, step) : parent.time);
    setCqEnd("");
    setCqTitle("");
    setCqParent(parent.id);
    setExpanded((p) => ({ ...p, [parent.id]: true }));
  };
  const submitChildQuick = () => {
    if (!cqTitle.trim()) return;
    addItem(day, { time: cqTime, endTime: cqEnd || null, title: cqTitle.trim(), place: "", memo: "", cat: cqCat, parentId: cqParent });
    setCqParent(null);
  };

  const startEdit = (item) => {
    setEditId(item.id);
    setETime(item.time);
    setEEnd(item.endTime || "");
  };
  const commitEdit = () => {
    updateItem(day, editId, { time: eTime, endTime: eEnd || null });
    setEditId(null);
  };

  const TimeEditor = () => (
    <span
      style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}
      onClick={(e) => e.stopPropagation()}
    >
      <TimeSelect value={eTime} step={step} onChange={setETime} />
      <span style={{ color: C.sub, fontSize: 12 }}>〜</span>
      <TimeSelect value={eEnd} step={step} onChange={setEEnd} allowEmpty />
      <button style={S.quickAddBtn} onClick={commitEdit}>OK</button>
      <button style={S.linkBtn} onClick={() => setEditId(null)}>取消</button>
    </span>
  );

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div>
          <p style={S.eyebrow}>旅のしおり</p>
          <h1 style={S.title}>{trip.name}</h1>
          <p style={S.dates}>
            {fmtDate(trip.start)} 〜 {fmtDate(trip.end)} ・ {days.length}日間
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={S.resetBtn} onClick={() => setShowSettings(!showSettings)}>⚙ 設定</button>
          <a style={{ ...S.resetBtn, textDecoration: "none", display: "inline-flex", alignItems: "center" }} href={`/t/${tripId}`}>
            共有ページ
          </a>
          <span style={{ fontSize: 11, alignSelf: "center", opacity: 0.8 }}>
            {saveState === "saving" ? "保存中…" : saveState === "error" ? "⚠ 保存失敗" : "✓ 保存済み"}
          </span>
        </div>
      </header>

      {showSettings && (
        <div style={S.settingsBar}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>時間の刻み:</span>
            {STEPS.map((s) => (
              <button
                key={s}
                onClick={() => save({ ...trip, stepMin: s })}
                style={{ ...S.stepPick, ...(step === s ? { background: C.accent, borderColor: C.accent, color: C.indigoDeep } : {}) }}
              >
                {s}分
              </button>
            ))}
          </div>
          <button
            onClick={() => save({ ...trip, autoRecalc: !trip.autoRecalc })}
            style={{ ...S.toggle, ...(trip.autoRecalc ? S.toggleOn : {}) }}
          >
            <span style={{ ...S.toggleKnob, ...(trip.autoRecalc ? S.toggleKnobOn : {}) }}>
              <span style={{ ...S.toggleDot, ...(trip.autoRecalc ? S.toggleDotOn : {}) }} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>
              並べ替えで時刻を詰め直す:{trip.autoRecalc ? "ON" : "OFF"}
            </span>
          </button>
        </div>
      )}

      <nav style={S.tabs}>
        {days.map((d, i) => (
          <button
            key={d}
            onClick={() => {
              setActiveDay(i);
              setQuickOpen(false);
              setCqParent(null);
              setEditId(null);
            }}
            style={{ ...S.tab, ...(i === activeDay ? S.tabActive : {}) }}
          >
            <span style={{ fontSize: 11, opacity: 0.75 }}>{i + 1}日目</span>
            <span style={{ fontWeight: 700 }}>{fmtDate(d)}</span>
          </button>
        ))}
      </nav>

      <main style={S.main}>
        {topItems.length === 0 && !quickOpen && (
          <div style={S.empty}>
            <p style={{ fontSize: 32, margin: 0 }}>🧳</p>
            <p style={{ color: C.sub, margin: "8px 0 0" }}>
              まだ予定がありません。下の「+」から始めましょう。
            </p>
          </div>
        )}
        <div style={{ position: "relative", paddingLeft: 8 }}>
          {(topItems.length > 0 || quickOpen) && <div style={S.routeLine} />}
          {topItems.map((item) => {
            const cat = CATS.find((c) => c.id === item.cat) || CATS[5];
            const kids = childrenOf(item.id);
            const isOpen = !!expanded[item.id];
            const isDragging = dragId === item.id;
            return (
              <div
                key={item.id}
                ref={(el) => (rowRefs.current[item.id] = el)}
                style={{ ...S.stop, ...(isDragging ? S.stopDragging : {}) }}
              >
                <div style={{ ...S.marker, borderColor: cat.color }}>
                  <span style={{ fontSize: 14 }}>{cat.icon}</span>
                </div>
                <div
                  style={{ ...S.stopBody, cursor: kids.length ? "pointer" : "default", ...(isDragging ? { boxShadow: "0 6px 18px rgba(34,48,74,0.25)", transform: "scale(1.02)" } : {}) }}
                  onPointerDown={(e) => pressStart(e, item.id)}
                  onClick={() => {
                    if (draggedRef.current) {
                      draggedRef.current = false;
                      return;
                    }
                    setExpanded((p) => ({ ...p, [item.id]: !p[item.id] }));
                  }}
                >
                  <div style={S.stopHead}>
                    {editId === item.id ? (
                      <TimeEditor />
                    ) : (
                      <button
                        style={{ ...S.time, color: cat.color, background: "none", border: "none", padding: 0, cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(item);
                        }}
                      >
                        {timeLabel(item)}
                      </button>
                    )}
                    <span style={{ ...S.catBadge, background: cat.color }}>{cat.label}</span>
                    <button
                      style={{ ...S.delBtn, color: C.indigo, marginLeft: "auto" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditFullItem(item);
                      }}
                    >
                      編集
                    </button>
                    <button
                      style={{ ...S.delBtn, marginLeft: 0 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(day, item.id);
                      }}
                    >
                      削除
                    </button>
                  </div>
                  <p style={S.stopTitle}>{item.title}</p>
                  {item.place && <p style={S.place}>📍 {item.place}</p>}
                  {item.memo && <p style={S.memo}>{item.memo}</p>}

                  <div style={S.groupToggle}>
                    <span style={{ transform: isOpen ? "rotate(90deg)" : "none", display: "inline-block", transition: "transform 0.15s" }}>▸</span>
                    {" "}
                    {kids.length > 0
                      ? `中の予定 ${kids.length}件${isOpen ? "" : "(タップで開く)"}`
                      : isOpen
                      ? "中に予定を追加できます"
                      : "タップして中に予定を追加"}
                  </div>
                  {isOpen && (
                    <>
                      {kids.map((k) => {
                        const kc = CATS.find((c) => c.id === k.cat) || CATS[5];
                        return (
                          <div
                            key={k.id}
                            ref={(el) => (rowRefs.current[k.id] = el)}
                            onPointerDown={(e) => {
                              e.stopPropagation(); // 親カードの長押しと二重発動しないように
                              pressStart(e, k.id, item.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ ...S.childRow, ...(dragId === k.id ? { boxShadow: "0 4px 12px rgba(34,48,74,0.25)", opacity: 0.9, transform: "scale(1.02)" } : {}) }}
                          >
                            <span style={{ fontSize: 13 }}>{kc.icon}</span>
                            {editId === k.id ? (
                              <TimeEditor />
                            ) : (
                              <button
                                style={{ ...S.childTime, color: kc.color, background: "none", border: "none", padding: 0, cursor: "pointer" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEdit(k);
                                }}
                              >
                                {timeLabel(k)}
                              </button>
                            )}
                            <span style={S.childTitle}>{k.title}</span>
                            <button
                              style={{ ...S.delBtn, fontSize: 11, color: C.indigo, marginLeft: 0 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditFullItem(k);
                              }}
                            >
                              編集
                            </button>
                            <button
                              style={{ ...S.delBtn, fontSize: 11, marginLeft: 0 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeItem(day, k.id);
                              }}
                            >
                              削除
                            </button>
                          </div>
                        );
                      })}

                      {cqParent === item.id ? (
                        <div style={S.childQuick} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                            {CATS.filter((c) => c.id !== "area").map((c) => (
                              <button
                                key={c.id}
                                onClick={() => setCqCat(c.id)}
                                title={c.label}
                                style={{ ...S.catMini, width: 28, height: 28, fontSize: 13, ...(cqCat === c.id ? { background: c.color, borderColor: c.color } : {}) }}
                              >
                                {c.icon}
                              </button>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                            <TimeSelect value={cqTime} step={step} onChange={setCqTime} />
                            <span style={{ color: C.sub, fontSize: 12 }}>〜</span>
                            <TimeSelect value={cqEnd} step={step} onChange={setCqEnd} allowEmpty />
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <input
                              data-title="1"
                              style={{ ...S.input, flex: 1, fontSize: 14, padding: "8px 10px" }}
                              placeholder="やること(Enterで追加)"
                              value={cqTitle}
                              onChange={(e) => setCqTitle(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && submitChildQuick()}
                            />
                            <button
                              style={{ ...S.quickAddBtn, opacity: cqTitle.trim() ? 1 : 0.4 }}
                              disabled={!cqTitle.trim()}
                              onClick={submitChildQuick}
                            >
                              追加
                            </button>
                            <button style={S.linkBtn} onClick={() => setCqParent(null)}>閉じる</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          style={{ ...S.linkBtn, marginTop: 8, display: "block" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openChildQuick(item);
                          }}
                        >
                          + この中に予定を追加
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {quickOpen ? (
            <div style={S.stop}>
              <div style={{ ...S.marker, borderColor: C.accent }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: C.accent }}>+</span>
              </div>
              <div style={{ ...S.stopBody, border: `2px dashed ${C.accent}` }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {CATS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setQCat(c.id)}
                      title={c.label}
                      style={{ ...S.catMini, ...(qCat === c.id ? { background: c.color, borderColor: c.color } : {}) }}
                    >
                      {c.icon}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                  <TimeSelect value={qTime} step={step} onChange={setQTime} />
                  <span style={{ color: C.sub, fontSize: 12 }}>〜</span>
                  <TimeSelect value={qEnd} step={step} onChange={setQEnd} allowEmpty />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    data-title="1"
                    style={{ ...S.input, flex: 1 }}
                    placeholder="やること(Enterで追加)"
                    value={qTitle}
                    onChange={(e) => setQTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitQuick()}
                  />
                  <button
                    style={{ ...S.quickAddBtn, opacity: qTitle.trim() ? 1 : 0.4 }}
                    disabled={!qTitle.trim()}
                    onClick={submitQuick}
                  >
                    追加
                  </button>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <button style={S.linkBtn} onClick={() => { setQuickOpen(false); setShowForm(true); }}>
                    詳しく入力(場所・メモ・グループ)
                  </button>
                  <button style={S.linkBtn} onClick={() => setQuickOpen(false)}>閉じる</button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <button style={S.plusMarker} onClick={openQuick}>+</button>
              <span style={{ fontSize: 13, color: C.sub }}>タップして予定を追加</span>
            </div>
          )}
        </div>
      </main>

      {(showForm || editFullItem) && (
        <AddForm
          groups={topItems}
          dayItems={dayItems}
          defaultTime={suggestNextTime(dayItems, step)}
          step={step}
          editItem={editFullItem}
          onAdd={(item) => {
            addItem(day, item);
            setShowForm(false);
          }}
          onSave={(patch) => {
            updateItem(day, editFullItem.id, patch);
            setEditFullItem(null);
          }}
          onDelete={() => {
            const target = editFullItem;
            setEditFullItem(null);
            removeItem(day, target.id);
          }}
          onClose={() => {
            setShowForm(false);
            setEditFullItem(null);
          }}
        />
      )}
    </div>
  );
}

function AddForm({ groups, dayItems, defaultTime, step, editItem, onAdd, onSave, onDelete, onClose }) {
  const isEdit = !!editItem;
  const [time, setTime] = useState(editItem?.time || defaultTime || "09:00");
  const [endTime, setEndTime] = useState(editItem?.endTime || "");
  const [title, setTitle] = useState(editItem?.title || "");
  const [place, setPlace] = useState(editItem?.place || "");
  const [memo, setMemo] = useState(editItem?.memo || "");
  const [cat, setCat] = useState(editItem?.cat || "sight");
  const [parentId, setParentId] = useState(editItem?.parentId ? String(editItem.parentId) : "");

  // 編集中の予定は、グループ選択肢から自分自身を除外(自分の中に自分は入れられない)
  const groupOptions = groups.filter((g) => !isEdit || g.id !== editItem.id);
  const sorted = (dayItems || []).slice().sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div style={S.sheet}>
      <div style={S.sheetHead}>
        <strong style={{ color: C.ink }}>{isEdit ? "予定を編集" : "予定を追加"}</strong>
        <button style={S.closeBtn} onClick={onClose}>閉じる</button>
      </div>

      {!isEdit && sorted.length > 0 && (
        <div style={S.daySummary}>
          <p style={S.daySummaryTitle}>この日の予定({sorted.length}件)</p>
          {sorted.map((i) => (
            <p key={i.id} style={S.daySummaryRow}>
              <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{timeLabel(i)}</span>{" "}
              {i.parentId ? "└ " : ""}{i.title}
            </p>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            style={{ ...S.catPick, ...(cat === c.id ? { background: c.color, color: "#fff", borderColor: c.color } : {}) }}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div>
          <label style={S.label}>開始</label>
          <TimeSelect value={time} step={step} onChange={setTime} />
        </div>
        <div>
          <label style={S.label}>終了(任意)</label>
          <TimeSelect value={endTime} step={step} onChange={setEndTime} allowEmpty />
        </div>
      </div>
      <label style={S.label}>やること</label>
      <input style={S.input} placeholder="例:清水寺を参拝" value={title} onChange={(e) => setTitle(e.target.value)} />
      {groupOptions.length > 0 && (
        <>
          <label style={S.label}>グループに入れる(任意)</label>
          <select style={S.input} value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">入れない(単独の予定)</option>
            {groupOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.time} {g.title} の中に入れる
              </option>
            ))}
          </select>
        </>
      )}
      <label style={S.label}>場所(任意)</label>
      <input style={S.input} placeholder="例:京都市東山区" value={place} onChange={(e) => setPlace(e.target.value)} />
      <label style={S.label}>メモ(任意)</label>
      <input style={S.input} placeholder="例:拝観料400円" value={memo} onChange={(e) => setMemo(e.target.value)} />
      <button
        style={{ ...S.primaryBtn, opacity: title.trim() ? 1 : 0.4 }}
        disabled={!title.trim()}
        onClick={() => {
          const payload = {
            time,
            endTime: endTime || null,
            title: title.trim(),
            place: place.trim(),
            memo: memo.trim(),
            cat,
            parentId: parentId ? Number(parentId) : null,
          };
          if (isEdit) onSave(payload);
          else onAdd(payload);
        }}
      >
        {isEdit ? "保存する" : "追加する"}
      </button>
      {isEdit && (
        <button style={S.deleteBtnFull} onClick={onDelete}>
          この予定を削除
        </button>
      )}
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    background: C.bg,
    fontFamily: '"Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", sans-serif',
    color: C.ink,
    paddingBottom: 96,
  },
  header: {
    background: C.indigoDeep,
    color: "#fff",
    padding: "24px 20px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  eyebrow: { fontSize: 11, letterSpacing: "0.25em", color: C.accent, margin: "0 0 4px", fontWeight: 700 },
  title: { fontSize: 22, margin: 0, fontWeight: 800, color: "inherit" },
  dates: { fontSize: 13, margin: "6px 0 0", opacity: 0.85 },
  resetBtn: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.4)",
    color: "#fff",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 12,
    cursor: "pointer",
  },
  settingsBar: { display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start", padding: "12px 20px", background: "#EDE9DD", color: C.ink },
  toggle: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "#fff",
    border: `1px solid ${C.line}`,
    borderRadius: 999,
    padding: "5px 12px 5px 6px",
    cursor: "pointer",
    color: C.ink,
  },
  toggleOn: { borderColor: C.accent, background: "#FBF1DD" },
  toggleKnob: {
    width: 32,
    height: 18,
    borderRadius: 999,
    background: C.line,
    position: "relative",
    transition: "background 0.15s",
    flexShrink: 0,
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.05)",
  },
  toggleKnobOn: { background: C.accent },
  toggleDot: {
    position: "absolute",
    top: 2,
    left: 2,
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: "#fff",
    transition: "left 0.15s",
    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
  },
  toggleDotOn: { left: 16 },
  stepPick: {
    border: `1px solid ${C.line}`,
    background: "#fff",
    color: C.ink,
    borderRadius: 999,
    padding: "4px 12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  tabs: { display: "flex", gap: 8, overflowX: "auto", padding: "12px 16px", background: C.indigoDeep },
  tab: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    padding: "8px 14px",
    borderRadius: 10,
    border: "none",
    background: "rgba(255,255,255,0.12)",
    color: "#fff",
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  tabActive: { background: C.accent, color: C.indigoDeep },
  main: { padding: "24px 20px 0", maxWidth: 480, margin: "0 auto" },
  empty: { textAlign: "center", padding: "40px 16px 24px" },
  routeLine: { position: "absolute", left: 25, top: 18, bottom: 10, width: 3, background: C.line, borderRadius: 2 },
  stop: { display: "flex", gap: 14, marginBottom: 20, position: "relative" },
  stopDragging: { opacity: 0.9, zIndex: 5 },
  marker: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#fff",
    border: "3px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    zIndex: 1,
  },
  plusMarker: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#fff",
    border: `3px solid ${C.accent}`,
    color: C.accent,
    fontSize: 20,
    fontWeight: 800,
    lineHeight: 1,
    cursor: "pointer",
    flexShrink: 0,
    zIndex: 1,
    position: "relative",
  },
  dragHandle: {
    cursor: "grab",
    color: C.sub,
    fontSize: 18,
    padding: "6px 8px",
    margin: "-6px 0 -6px -8px",
    touchAction: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
  },
  stopBody: {
    WebkitUserSelect: "none",
    userSelect: "none",
    WebkitTouchCallout: "none",
    background: C.card,
    borderRadius: 12,
    padding: "12px 14px",
    flex: 1,
    boxShadow: "0 1px 4px rgba(34,48,74,0.08)",
  },
  stopHead: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  time: { fontWeight: 800, fontSize: 15, fontVariantNumeric: "tabular-nums" },
  catBadge: { color: "#fff", fontSize: 11, padding: "2px 8px", borderRadius: 999, fontWeight: 700 },
  delBtn: { marginLeft: "auto", background: "none", border: "none", color: C.sub, fontSize: 12, cursor: "pointer" },
  stopTitle: { margin: "6px 0 0", fontWeight: 700, fontSize: 15 },
  place: { margin: "4px 0 0", fontSize: 13, color: C.sub },
  memo: { margin: "4px 0 0", fontSize: 13, color: C.sub },
  groupToggle: { marginTop: 10, fontSize: 12, fontWeight: 700, color: C.indigo },
  childRow: {
    WebkitUserSelect: "none",
    userSelect: "none",
    WebkitTouchCallout: "none",
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    marginTop: 8,
    background: "#F2F4F8",
    borderRadius: 8,
    borderLeft: `3px solid ${C.line}`,
    flexWrap: "wrap",
  },
  childTime: { fontWeight: 700, fontSize: 13, fontVariantNumeric: "tabular-nums" },
  childTitle: { fontSize: 13, fontWeight: 600, flex: 1 },
  childQuick: {
    marginTop: 8,
    padding: "10px",
    background: "#FBF7EC",
    border: `1.5px dashed ${C.accent}`,
    borderRadius: 10,
  },
  catMini: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: `1px solid ${C.line}`,
    background: "#fff",
    fontSize: 15,
    cursor: "pointer",
    padding: 0,
  },
  timeSel: {
    border: `1px solid ${C.line}`,
    borderRadius: 8,
    padding: "6px 4px",
    fontSize: 15,
    background: "#fff",
    color: C.ink,
    fontVariantNumeric: "tabular-nums",
  },
  quickAddBtn: {
    background: C.indigo,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: C.indigo,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    padding: 0,
  },
  sheet: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    background: "#fff",
    borderRadius: "20px 20px 0 0",
    padding: "18px 20px 28px",
    boxShadow: "0 -6px 24px rgba(34,48,74,0.18)",
    maxWidth: 480,
    margin: "0 auto",
    maxHeight: "85vh",
    overflowY: "auto",
  },
  daySummary: {
    background: "#F2F4F8",
    borderRadius: 10,
    padding: "10px 12px",
    marginBottom: 14,
    maxHeight: 110,
    overflowY: "auto",
  },
  daySummaryTitle: { margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: C.sub, letterSpacing: "0.05em" },
  daySummaryRow: { margin: "3px 0", fontSize: 13, color: C.ink },
  sheetHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  closeBtn: { background: "none", border: "none", color: C.sub, fontSize: 13, cursor: "pointer" },
  catPick: {
    border: `1px solid ${C.line}`,
    background: "#fff",
    color: C.ink,
    borderRadius: 999,
    padding: "6px 12px",
    fontSize: 13,
    cursor: "pointer",
  },
  label: { display: "block", fontSize: 12, fontWeight: 700, color: C.sub, margin: "10px 0 4px" },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: `1px solid ${C.line}`,
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 15,
    background: "#fff",
    color: C.ink,
  },
  primaryBtn: {
    width: "100%",
    marginTop: 18,
    background: C.indigo,
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "13px 0",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  deleteBtnFull: {
    width: "100%",
    marginTop: 10,
    background: "none",
    color: C.danger,
    border: `1px solid ${C.danger}`,
    borderRadius: 12,
    padding: "11px 0",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
};
