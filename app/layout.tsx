import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dizlee Reconciliation Platform",
  description: "Multi-portal reconciliation platform for Dizlee",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-zinc-900 antialiased">
        {children}
      </body>
    </html>
  );
}
