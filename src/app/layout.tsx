import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Create3DParts | Custom 3D Printing in North NJ",
    template: "%s | Create3DParts",
  },
  description:
    "Custom 3D printing service in North NJ. Send a photo or STL file and get a firm quote within hours. No payment until you approve. Local pickup or nationwide shipping.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://create3dparts.com"
  ),
  openGraph: {
    title: "Create3DParts | Custom 3D Printing in North NJ",
    description:
      "Send a photo or STL file and get a firm quote within hours. No payment until you approve. Local pickup or we ship anywhere.",
    url: "https://create3dparts.com",
    siteName: "Create3DParts",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Create3DParts | Custom 3D Printing in North NJ",
    description:
      "Send a photo or STL — firm quote within hours. No payment until you approve.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icon.svg",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
