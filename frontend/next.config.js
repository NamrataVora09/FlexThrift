/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'images.unsplash.com',
      'ui-avatars.com',
      'localhost',
      // Railway backend domain (update this after deployment)
      ...(process.env.NEXT_PUBLIC_BACKEND_URL
        ? [new URL(process.env.NEXT_PUBLIC_BACKEND_URL).hostname]
        : []),
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.railway.app',
      },
      {
        protocol: 'https',
        hostname: '**.vercel.app',
      },
    ],
  },
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
    return [
      {
        source: '/api/v1/superadmin/:path*',
        destination: `${apiBase}/api/v1/superadmin/:path*`,
      },
      {
        source: '/api/v1/:path*',
        destination: `${apiBase}/api/v1/:path*`,
      },
      {
        source: '/api/superadmin/:path*',
        destination: `${apiBase}/api/v1/superadmin/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
