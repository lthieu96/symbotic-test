/**
 * BACKEND_INTERNAL_URL is used server-side (in rewrites, evaluated at runtime)
 * so under Docker it points to the backend service hostname. WEBSOCKET_URL is
 * inlined into the browser bundle at build time, so it must be reachable from
 * the user's browser (the host-mapped backend port).
 */
const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:8080'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // minimal traced server bundle for small Docker images
  reactStrictMode: true,
  transpilePackages: ['antd'],
  env: {
    WEBSOCKET_URL: process.env.WEBSOCKET_URL || 'ws://localhost:8080',
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:8080/api',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_INTERNAL_URL}/api/:path*`,
      },
    ];
  },
}

module.exports = nextConfig