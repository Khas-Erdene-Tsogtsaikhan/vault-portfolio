import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SupabaseAuthProvider } from "@/components/SupabaseAuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "VAULT | Portfolio OS for Physical Collectors",
  description: "A Bloomberg Terminal for serious collectors of valuable physical things."
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
