// 短い公開ID(URL用)と編集キーを生成
const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
export function shortId(len = 10) {
  let s = "";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (const b of arr) s += CHARS[b % CHARS.length];
  return s;
}
export function editKey() {
  return crypto.randomUUID().replace(/-/g, "");
}
