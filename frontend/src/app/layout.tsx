import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Argus",
  description: "AI Video Annotation Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
