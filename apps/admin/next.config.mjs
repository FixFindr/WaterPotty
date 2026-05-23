/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required: Next.js must transpile local workspace packages (TypeScript source)
  transpilePackages: ['@water-potty/db', '@water-potty/shared'],
}

export default nextConfig
