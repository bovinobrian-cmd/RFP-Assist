import type { Metadata } from "next";
import "./globals.css";
import { AppStateProvider } from "@/state/AppStateContext";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "RFP Response Platform — J.P. Morgan Asset Management",
  description:
    "Prototype: governed, provenance-first RFP response workflow for institutional asset management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AppStateProvider>
          <AppShell>{children}</AppShell>
        </AppStateProvider>
      </body>
    </html>
  );
}
