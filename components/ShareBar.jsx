"use client";
// 共有バー: URLコピー / LINE / X / Facebook / QRコード
import { useState } from "react";

export default function ShareBar({ url, title }) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const text = encodeURIComponent(`${title} | 旅のしおり`);
  const u = encodeURIComponent(url);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      prompt("このURLをコピーしてください", url);
    }
  };

  const btn = {
    border: "1px solid #B9C4D6", background: "#fff", borderRadius: 999,
    padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer",
    color: "#22304A", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6,
  };

  return (
    <div className="no-print" style={{ maxWidth: 560, margin: "16px auto 0", padding: "0 20px" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button style={btn} onClick={copy}>{copied ? "✓ コピーしました" : "🔗 URLをコピー"}</button>
        <a style={btn} href={`https://line.me/R/msg/text/?${text}%0A${u}`} target="_blank" rel="noopener noreferrer">LINEで送る</a>
        <a style={btn} href={`https://twitter.com/intent/tweet?text=${text}&url=${u}`} target="_blank" rel="noopener noreferrer">Xでシェア</a>
        <a style={btn} href={`https://www.facebook.com/sharer/sharer.php?u=${u}`} target="_blank" rel="noopener noreferrer">Facebook</a>
        <button style={btn} onClick={() => setShowQR(!showQR)}>QRコード</button>
      </div>
      {showQR && (
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <img
            alt="この旅程のQRコード"
            width={180}
            height={180}
            style={{ borderRadius: 8, border: "1px solid #B9C4D6", background: "#fff", padding: 8 }}
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${u}`}
          />
        </div>
      )}
    </div>
  );
}
