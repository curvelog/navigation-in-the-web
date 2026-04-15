import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Web Explorer - Automated Web Discovery',
  description: 'Daily automated web exploration, summarization, and indexing system',
  keywords: ['web explorer', 'web crawler', 'daily summaries', 'web discovery'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
