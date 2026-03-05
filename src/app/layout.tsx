import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Create3DParts — Local 3D Printing, North NJ",
  description:
    "Send a photo or STL file and get a quote within hours. No payment until you approve. Pickup in North NJ or we ship anywhere.",
  metadataBase: new URL("https://www.create3dparts.com"),
  openGraph: {
    title: "Create3DParts — Local 3D Printing, North NJ",
    description:
      "Send a photo or STL file and get a quote within hours. No payment until you approve.",
    url: "https://www.create3dparts.com",
    siteName: "Create3DParts",
    type: "website",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
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
      </body>
    </html>
  );
}
