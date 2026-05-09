import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SupabaseAuthProvider } from "@/components/SupabaseAuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "VAULT - Collectibles Portfolio Tracker",
  description: "Track your trading cards, watches, sneakers, and collectibles like a financial portfolio. Real market values from PriceCharting. Daily price updates. Built for serious collectors.",
  keywords: [
    "collectibles portfolio tracker",
    "pokemon card value tracker",
    "trading card portfolio",
    "collectibles price tracker",
    "vault collectibles",
    "collection value tracker"
  ],
  metadataBase: new URL("https://vaultcollection.org"),
  openGraph: {
    title: "VAULT - Know What Your Collection Is Worth",
    description: "Track your collectibles like a financial portfolio. Real market values, daily updates, provenance records.",
    url: "https://vaultcollection.org",
    siteName: "VAULT",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "VAULT - Collectibles Portfolio Tracker",
    description: "Track your trading cards, watches, and collectibles like a financial portfolio."
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  manifest: "/site.webmanifest"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
      </body>
    </html>
  );
}
