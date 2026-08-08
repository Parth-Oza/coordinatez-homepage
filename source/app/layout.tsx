import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const ogImage = `${protocol}://${host}/og.png`;

  return {
    title: "COORDINATEZ — Kyoto Craft, Modern Ritual",
    description: "A modern matcha ritual rooted in Kyoto craft.",
    icons: {
      icon: "/favicon.svg",
    },
    openGraph: {
      title: "COORDINATEZ — Kyoto Craft, Modern Ritual",
      description: "Every shade finds its match.",
      images: [{ url: ogImage, width: 1536, height: 803 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "COORDINATEZ — Kyoto Craft, Modern Ritual",
      description: "Every shade finds its match.",
      images: [ogImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
