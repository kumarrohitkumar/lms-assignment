import type { Metadata, Viewport } from 'next';
import { Public_Sans } from 'next/font/google';
import { themeBootScript } from '@/lib/theme';
import './globals.css';

const publicSans = Public_Sans({ variable: '--font-public-sans', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Kosh — Loan Management',
  description: 'Apply for a personal loan and manage loans from application to closure.',
};

export const viewport: Viewport = { themeColor: '#0e1318' };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" data-theme="dark" className={`${publicSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Applies a saved theme before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans text-[15px] leading-relaxed">{children}</body>
    </html>
  );
}
