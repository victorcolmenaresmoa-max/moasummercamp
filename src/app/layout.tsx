import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'MOA Reading Lab · Immersive Summer Camp 2026',
    template: '%s · MOA Reading Lab',
  },
  description: 'Reading Lab digital — Route 1, Teachers A2/B1. Read first. Think second. Ask AI third.',
  applicationName: 'MOA Reading Lab',
  // El favicon y el icono de iOS los sirve Next automaticamente desde
  // src/app/icon.png y src/app/apple-icon.png (el logo oficial de MOA).
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#16808E',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/*
          Tipografia de marca cargada por <link>:
            Poppins  -> titulos (geometrica y redondeada, como el wordmark "moa")
            Nunito Sans -> lectura larga

          Se hace asi (y no con next/font) a proposito: next/font descarga las
          fuentes EN TIEMPO DE BUILD, asi que una compilacion sin salida a
          internet falla. Con <link> el proyecto compila siempre y las fuentes
          llegan del CDN en tiempo de ejecucion. `preconnect` adelanta el
          handshake y `display=swap` evita el texto invisible: si la fuente
          tardara, se ve el fallback del sistema y luego cambia.
        */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=Nunito+Sans:wght@400;600;700;800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
