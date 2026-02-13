import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google"; // 구글 폰트 가져오기
import "./globals.css";

// 픽셀 폰트 설정
const pixelFont = Press_Start_2P({ 
  weight: "400", 
  subsets: ["latin"],
  variable: "--font-pixel", // CSS 변수로 사용
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
      <body className={`${pixelFont.variable} font-sans bg-black text-green-500`}>
        {children}
      </body>
    </html>
  );
}