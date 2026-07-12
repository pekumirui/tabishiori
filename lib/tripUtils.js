// フロント/表示で共通に使う小道具
export const CATS = [
  { id: "move", label: "移動", icon: "🚃", color: "#2C4A7C" },
  { id: "sight", label: "観光", icon: "⛩️", color: "#4A7C59" },
  { id: "food", label: "食事", icon: "🍜", color: "#C2703E" },
  { id: "stay", label: "宿泊", icon: "🏨", color: "#6B5B95" },
  { id: "area", label: "エリア", icon: "🗺️", color: "#3E7C8A" },
  { id: "other", label: "その他", icon: "📌", color: "#7A8699" },
];

export const catOf = (id) => CATS.find((c) => c.id === id) || CATS[5];

export const fmtDate = (d) => {
  const dt = new Date(d + "T00:00:00");
  const w = ["日", "月", "火", "水", "木", "金", "土"][dt.getDay()];
  return `${dt.getMonth() + 1}/${dt.getDate()}(${w})`;
};

export const daysBetween = (start, end) => {
  const toYMD = (dt) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  const out = [];
  let cur = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (cur <= last && out.length < 30) {
    out.push(toYMD(cur));
    cur = new Date(cur.getTime() + 86400000);
  }
  return out;
};

export const timeLabel = (item) =>
  item.endTime ? `${item.time}-${item.endTime}` : item.time;
