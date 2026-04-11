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
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://127.0.0.1:8080/api/v1/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://127.0.0.1:8080/uploads/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
