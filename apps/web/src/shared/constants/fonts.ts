import { Merriweather, Libre_Baskerville } from 'next/font/google';

export const merriweather = Merriweather({
  weight: ['300', '400', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-merriweather',
});

export const libreBaskerville = Libre_Baskerville({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-libre-baskerville',
});

// Combined font stack for reader view
export const readerFontFamily = `${merriweather.style.fontFamily}, ${libreBaskerville.style.fontFamily}, Baskerville, Georgia, serif`;