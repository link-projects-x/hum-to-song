import type { ReactNode } from 'react';

import { Inter } from 'next/font/google';

import type { Metadata, Viewport } from 'next';

import '@/styles/globals.scss';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'Hum to Song',
  description:
    'Hum a melody and get a full song: the notes are found in the browser, then chords, bass and drums are written in the style you pick.',
};

export const viewport: Viewport = {
  themeColor: '#0f1115',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
