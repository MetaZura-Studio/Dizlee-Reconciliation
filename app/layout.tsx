import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";

import { AuthProvider } from "./providers";
import "./globals.css";

const appSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-app-sans",
});

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
      <body
        className={`${appSans.variable} min-h-screen bg-canvas font-sans text-foreground antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
