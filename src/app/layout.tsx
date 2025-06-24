"use client";

import "./globals.css";
import { Merriweather, Libre_Baskerville } from 'next/font/google';

import ClientLayout from "../components/ClientLayout";
import SessionProvider from "../components/SessionProvider";

const merriweather = Merriweather({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-merriweather',
});

const libreBaskerville = Libre_Baskerville({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-libre-baskerville',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${merriweather.variable} ${libreBaskerville.variable}`}>
      <body className="antialiased" suppressHydrationWarning>
        <SessionProvider>
          <ClientLayout>{children}</ClientLayout>
        </SessionProvider>
      </body>
    </html>
  );
}
