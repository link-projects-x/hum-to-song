import type { ReactNode } from 'react';

import { Bricolage_Grotesque, Inter, JetBrains_Mono } from 'next/font/google';

import type { Metadata, Viewport } from 'next';

import '@/styles/globals.scss';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const display = Bricolage_Grotesque({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-display',
  display: 'swap',
});
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Hum to Song',
  description:
    'Hum a melody and get a full song: the notes are found in the browser, then chords, bass and drums are written in the style you pick.',
};

export const viewport: Viewport = {
  themeColor: '#0d0e12',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
