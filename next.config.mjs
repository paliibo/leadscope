/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * The e2e run builds and starts a production server. Pointing it at its own
   * output directory means it can't clobber the `.next` a running `pnpm dev` is
   * serving from — otherwise the two silently corrupt each other's chunks.
   */
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: true,
  poweredByHeader: false,
  // Traced standalone output: the Docker image ships only the modules actually
  // reachable from the server, which is roughly a tenth of node_modules.
  output: process.env.NEXT_OUTPUT_STANDALONE === '1' ? 'standalone' : undefined,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  serverExternalPackages: ['@libsql/client'],
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
