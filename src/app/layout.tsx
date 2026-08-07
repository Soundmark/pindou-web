import type { Metadata } from "next";
import { AuthProvider } from "@/providers/AuthProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { Header } from "@/components/layout/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pindou - Bead Pattern Creator",
  description: "Turn your photos into fusebead patterns",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-background text-text-primary antialiased">
        <AuthProvider>
          <QueryProvider>
            <Header />
            <main className="flex-1">{children}</main>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}