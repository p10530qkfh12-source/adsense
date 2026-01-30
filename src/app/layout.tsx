import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 포스팅 자동화 | Human-like Content Generator",
  description: "구글 애드센스 승인을 위한 인간 중심형 AI 포스팅 자동화 앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
