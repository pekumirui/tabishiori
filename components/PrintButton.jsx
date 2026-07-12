"use client";
export default function PrintButton() {
  return (
    <div className="no-print" style={{ textAlign: "center", padding: "16px 0" }}>
      <button
        onClick={() => window.print()}
        style={{ background: "#2C4A7C", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
      >
        🖨 印刷 / PDFに保存
      </button>
      <p style={{ fontSize: 12, color: "#7A8699", margin: "8px 0 0" }}>
        印刷ダイアログで「PDFとして保存」を選ぶとPDFになります(1日1ページ)
      </p>
    </div>
  );
}
