import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted (from @fontsource, OFL licensed) so builds don't depend on Google Fonts
const dmSans = localFont({ src: "./fonts/dm-sans.woff2", variable: "--font-dm-sans", weight: "100 1000", display: "swap" });
const bricolage = localFont({ src: "./fonts/bricolage.woff2", variable: "--font-bricolage", weight: "200 800", display: "swap" });

export const metadata: Metadata = {
  title: { default: "duet · the songs you both actually play", template: "%s · duet" },
  description: "Compare YouTube watch history with friends and play every song you have in common.",
};

export const viewport: Viewport = {
  themeColor: "#0f0f13",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${dmSans.variable} ${bricolage.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
