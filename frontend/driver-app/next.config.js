/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@cab/types', 'react-leaflet', 'leaflet'],
};

module.exports = nextConfig;
