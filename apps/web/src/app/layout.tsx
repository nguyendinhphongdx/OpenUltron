import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { PublicEnvScript } from 'next-runtime-env';
import type { ReactNode } from 'react';

import { Providers } from '@/providers';
import { cn } from '@/lib/utils';

import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'], display: 'swap' });
const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono-ui',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ultron',
  description: 'Personal AI agent console',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Inject NEXT_PUBLIC_* vào window.__ENV — đọc runtime thay vì bake lúc build */}
        <PublicEnvScript />
      </head>
      <body className={cn('min-h-screen font-sans antialiased', inter.variable, jetbrainsMono.variable)}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
