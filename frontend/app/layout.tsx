import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const primaryFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-primary",
});

export const metadata: Metadata = {
  title: "CASCTF 2026",
  description: "Capture The Flag Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${primaryFont.variable} bg-black text-zinc-100 antialiased`}>
        {/* 전체 페이지 공통 배경 노이즈 레이어 */}
        <div className="noise" />
        {children}
      </body>
    </html>
  );
}
