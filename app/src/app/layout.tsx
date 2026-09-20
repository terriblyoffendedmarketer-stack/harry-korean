import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://yer-a-korean-harry.vercel.app"),
  title: "H해 — Harry Potter Korean Audiobook",
  description: "Listen to Harry Potter in Korean at 0.75x speed with synced subtitles, vocab glossing, and chapter summaries.",
  openGraph: {
    title: "H해 — Harry Potter Korean Audiobook",
    description: "Listen to Harry Potter in Korean at 0.75x speed with synced subtitles, vocab glossing, and chapter summaries.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f0f1a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
