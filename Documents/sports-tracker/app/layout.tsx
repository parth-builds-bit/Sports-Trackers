import type { Metadata, Viewport } from "next";
import { DM_Sans, Oswald } from "next/font/google";
import "./globals.css";

const body = DM_Sans({ subsets: ["latin"], variable: "--font-body" });
const display = Oswald({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  metadataBase: new URL("https://sports-trackers1-six.vercel.app"),
  title: "The Match Centre",
  description:
    "Live football scores, fixtures, league tables and top scorers for 12 competitions.",
  openGraph: {
    title: "The Match Centre",
    description:
      "Live football scores, fixtures, league tables and top scorers for 12 competitions.",
    siteName: "The Match Centre",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Match Centre",
    description:
      "Live football scores, fixtures, league tables and top scorers for 12 competitions.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09110d",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-accent="green">
      <body className={`${body.variable} ${display.variable}`}>{children}</body>
    </html>
  );
}