"use client";

import "./globals.css";

import Script from "next/script";
import ClientLayout from "../components/ClientLayout";
import SessionProvider from "../components/SessionProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <Script
          defer
          data-domain="roastmypost.org"
          src="https://plausible.io/js/script.file-downloads.hash.outbound-links.js"
          strategy="afterInteractive"
        />
        <Script id="plausible-init" strategy="afterInteractive">
          {`window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }`}
        </Script>
      </head>
      <body className="antialiased h-full" suppressHydrationWarning>
        <SessionProvider>
          <ClientLayout>{children}</ClientLayout>
        </SessionProvider>
      </body>
    </html>
  );
}
