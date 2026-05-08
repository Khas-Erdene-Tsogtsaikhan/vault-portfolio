import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SupabaseAuthProvider } from "@/components/SupabaseAuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "VAULT",
  description: "Track your collection like a portfolio",
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
