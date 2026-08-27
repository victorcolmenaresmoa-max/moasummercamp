import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'MOA Reading Lab · Immersive Summer Camp 2026',
    template: '%s · MOA Reading Lab',
  },
  description: 'MOA Education digital Reading Lab for the Immersive Summer Camp 2026.',
  applicationName: 'MOA Reading Lab',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#16808E',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
