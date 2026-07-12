import "./globals.css";

export const metadata = {
  title: "旅のしおり",
  description: "旅程をさっと組み立てて、URLで共有できるしおり",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
