import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";

import { AuthProvider } from "./providers";
import "./globals.css";

const appSans = Geist({
  subsets: ["latin"],
  variable: "--font-app-sans",
});

const appMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-app-mono",
});

export const metadata: Metadata = {
  title: "Dizlee Reconciliation Platform",
  description: "Multi-portal reconciliation platform for Dizlee",
  icons: {
    icon: [{ url: "/dizlee-logo.png", type: "image/png" }],
    apple: [{ url: "/dizlee-logo.png", type: "image/png" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Opt into dynamic rendering so Next can apply the per-request CSP nonce.
  await headers();

  return (
    <html lang="en">
      <body
        className={`${appSans.variable} ${appMono.variable} min-h-screen bg-canvas font-sans text-foreground antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
