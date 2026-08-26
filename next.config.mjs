/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
    // Tree-shaking mas agresivo de las librerias grandes del cliente.
    optimizePackageImports: ['@supabase/supabase-js', '@supabase/ssr'],
  },

  // El workbook es contenido privado: nada de cache en CDN ni indexacion.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        // Las fuentes auto-hospedadas por next/font si pueden cachearse fuerte.
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
