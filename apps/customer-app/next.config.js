/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@cab/types'],
  images: {
    domains: ['api.dicebear.com'],
  },
  env: {
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    NEXT_PUBLIC_API_GATEWAY_URL: process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:8080',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080',
  },
};

module.exports = nextConfig;
