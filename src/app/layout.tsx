import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MOA Reading Lab | Immersive Summer Camp 2026',
  description: 'Reading Lab digital - Route 1, Teachers A2/B1. Read first. Think second. Ask AI third.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
